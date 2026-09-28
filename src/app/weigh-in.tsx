import { useState } from 'react';
import { Image, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { fromCm, fromKg, toCm, toKg } from '../body';
import { delWeighIn, imgKey, MEASURES, newId, putWeighIn, today, type MeasureId, type WeighIn } from '../model';
import { useLog, useTheme } from '../store';
import { confirm, notify, pickImage } from '../io';
import { goBack } from '../components';
import { DateField } from '../DateField';
import { Button, Field, Gap, Header, IconButton, Screen, selectAll, T } from '../ui';
import { radius, space } from '../theme';

const r1 = (n: number) => String(Math.round(n * 10) / 10);
const parse = (t: string) => { const n = parseFloat(t.replace(',', '.')); return Number.isFinite(n) ? n : null; };

/** Log (or edit, `?id=`) a weigh-in: weight and date, and optionally body fat, tape measurements and a photo. */
export default function WeighInScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { log, v, update, images, setImage } = useLog();
  const { c } = useTheme();
  const units = log.settings.units ?? { weight: 'kg', length: 'cm' };
  const ed = id ? v.weighIns.find((x) => x.id === id) : undefined;
  const last = v.weighIns.at(-1);
  const photoKey = (wid: string) => `weigh-${wid}`;
  const [date, setDate] = useState(ed?.date ?? today());
  const [weight, setWeight] = useState(ed ? r1(fromKg(ed.weight, units.weight)) : last ? r1(fromKg(last.weight, units.weight)) : '');
  const [fat, setFat] = useState(ed?.fat !== undefined ? String(ed.fat) : '');
  const [m, setM] = useState<Record<MeasureId, string>>(() => Object.fromEntries(MEASURES.map((x) => [x.id, ed?.[x.id] !== undefined ? r1(fromCm(ed[x.id]!, units.length)) : ''])) as Record<MeasureId, string>);
  const [more, setMore] = useState(!!ed && (ed.fat !== undefined || MEASURES.some((x) => ed[x.id] !== undefined) || !!ed.photo));
  const [photo, setPhoto] = useState<string | null>(ed?.photo ? images[imgKey(v.profile.id, photoKey(ed.id))] ?? null : null);

  function save() {
    const w = parse(weight);
    const kg = w === null ? null : toKg(w, units.weight);
    if (kg === null || kg < 20 || kg > 400) return notify('Enter your weight', `In ${units.weight}.`);
    const f = parse(fat);
    if (fat.trim() && (f === null || f <= 0 || f >= 80)) return notify('Body fat looks off', 'Enter a percentage, e.g. 18.');
    const wid = ed?.id ?? newId('b');
    const out: Omit<WeighIn, 'profileId'> = { id: wid, date, weight: Math.round(kg * 100) / 100, at: ed?.at ?? Date.now() };
    if (f !== null && fat.trim()) out.fat = f;
    for (const x of MEASURES) { const n = parse(m[x.id]); if (n !== null && n > 0) out[x.id] = Math.round(toCm(n, units.length) * 10) / 10; }
    if (photo) out.photo = true;
    update((l) => putWeighIn(l, out));
    if (photo) setImage(photoKey(wid), photo);
    else if (ed?.photo) setImage(photoKey(wid), null);
    goBack();
  }
  async function remove() {
    if (!ed || !(await confirm('Delete this weigh-in?', '', 'Delete', true))) return;
    update((l) => delWeighIn(l, ed.id));
    if (ed.photo) setImage(photoKey(ed.id), null);
    goBack();
  }
  async function addPhoto() {
    try { const img = await pickImage(); if (img) setPhoto(img); } catch (e) { notify('Could not add the photo', (e as Error).message); }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title={ed ? 'Edit weigh-in' : 'Log weigh-in'} right={<IconButton icon="close" label="Close" onPress={goBack} />} />
      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Field label={`Weight (${units.weight})`} value={weight} onChangeText={setWeight} inputMode="decimal" autoFocus={!ed} onFocus={selectAll}
              style={{ fontSize: 28, minHeight: 60, textAlign: 'center' }} onSubmitEditing={save} />
          </View>
          <DateField value={date} onChange={setDate} />
        </View>
        <T v="small">Weigh at the same time each day, ideally in the morning before breakfast. The trend smooths out day-to-day swings.</T>
        {!more ? <Button title="Add body fat, measurements or a photo" icon="add" kind="ghost" onPress={() => setMore(true)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} /> : (
          <View style={{ gap: space.md }}>
            <T v="label">Optional</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              <View style={{ flexBasis: '47%', flexGrow: 1 }}><Field label="Body fat (%)" value={fat} onChangeText={setFat} inputMode="decimal" onFocus={selectAll} /></View>
              {MEASURES.map((x) => (
                <View key={x.id} style={{ flexBasis: '47%', flexGrow: 1 }}>
                  <Field label={`${x.label} (${units.length})`} value={m[x.id]} onChangeText={(t) => setM({ ...m, [x.id]: t })} inputMode="decimal" onFocus={selectAll} />
                </View>
              ))}
            </View>
            {photo ? (
              <View style={{ gap: space.sm }}>
                <Image source={{ uri: photo }} accessibilityLabel="Progress photo" resizeMode="cover" style={{ width: 180, height: 240, borderRadius: radius.md, backgroundColor: c.chip }} />
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button title="Replace photo" kind="ghost" onPress={addPhoto} style={{ minHeight: 40 }} />
                  <Button title="Remove" kind="ghost" onPress={() => setPhoto(null)} style={{ minHeight: 40 }} />
                </View>
              </View>
            ) : <Button title="Add a progress photo" icon="camera-outline" kind="secondary" onPress={addPhoto} />}
            <T v="small" style={{ fontSize: 12 }}>Photos stay on this phone (and in your backups), like everything else.</T>
          </View>
        )}
        <Button title="Save" onPress={save} />
        {ed && <Button title="Delete weigh-in" kind="danger" onPress={remove} />}
      </View>
      <Gap />
    </Screen>
  );
}
