import { useState } from 'react';
import { PanResponder, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getEx, moveExercise } from '../model';
import { useLog, useTheme } from '../store';
import { Empty, ExArt, goBack } from '../components';
import { useEditWorkout } from '../workout';
import { Button, Header, IconButton, Screen, T } from '../ui';
import { radius, space } from '../theme';

const ROW = 60; // every row is this tall (with its gap), so a drag of n × ROW is n places

/** Drag a workout's exercises (`?workout=`) into a new order. Each drop saves straight away. */
export default function Reorder() {
  const { workout: id = '' } = useLocalSearchParams<{ workout: string }>();
  const { v } = useLog();
  const { c } = useTheme();
  const edit = useEditWorkout(id);
  const w = v.workouts.find((x) => x.id === id);
  const [drag, setDrag] = useState<{ from: number; dy: number } | null>(null);
  const n = w?.exercises.length ?? 0;
  const target = drag ? Math.max(0, Math.min(n - 1, drag.from + Math.round(drag.dy / ROW))) : -1;
  const done = <Button title="Done" onPress={goBack} style={{ minHeight: 44, paddingHorizontal: space.lg }} />;
  if (!w) return <Screen><Header title="Reorder exercises" right={done} /><Empty>Workout not found.</Empty></Screen>;
  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Reorder exercises" right={done} />
      <T v="small" style={{ marginBottom: space.md }}>Drag an exercise by its handle, or use the arrows.</T>
      {w.exercises.map((e, i) => {
        const ex = getEx(v, e.exerciseId);
        const dragging = drag?.from === i;
        // The rows between where it started and where it would land step aside to make room.
        const shift = dragging || !drag ? 0
          : drag.from < i && i <= target ? -ROW
          : target <= i && i < drag.from ? ROW : 0;
        const inSuperset = e.group !== undefined && (w.exercises[i - 1]?.group === e.group || w.exercises[i + 1]?.group === e.group);
        return (
          <View key={`${e.exerciseId}-${i}`} style={{
            height: ROW - 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: space.sm,
            paddingHorizontal: space.sm, borderRadius: radius.md, backgroundColor: c.card,
            borderWidth: 1, borderColor: dragging ? c.brand : c.border,
            ...(inSuperset ? { borderLeftWidth: 4, borderLeftColor: c.brand } : {}),
            transform: [{ translateY: dragging ? drag.dy : shift }],
            zIndex: dragging ? 1 : 0, opacity: dragging ? 0.95 : 1,
          }}>
            <Handle onMove={(dy) => setDrag(dy === null ? null : { from: i, dy })}
              onDrop={(dy) => edit((x) => moveExercise(x, i, i + Math.round(dy / ROW)))} />
            <ExArt id={e.exerciseId} size={32} />
            <T numberOfLines={1} style={{ flex: 1, fontWeight: '600' }}>{ex.name}</T>
            {i > 0 && <IconButton icon="chevron-up" size={20} label={`Move ${ex.name} up`} onPress={() => edit((x) => moveExercise(x, i, i - 1))} />}
            {i < n - 1 && <IconButton icon="chevron-down" size={20} label={`Move ${ex.name} down`} onPress={() => edit((x) => moveExercise(x, i, i + 1))} />}
          </View>
        );
      })}
    </Screen>
  );
}

/** The grip a row is dragged by. Its PanResponder is made once: a new one mid-gesture would lose track of the drag. */
function Handle({ onMove, onDrop }: { onMove: (dy: number | null) => void; onDrop: (dy: number) => void }) {
  const { c } = useTheme();
  const cb = { onMove, onDrop };
  const [pan] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => cb.onMove(0),
    onPanResponderMove: (_, g) => cb.onMove(g.dy),
    onPanResponderRelease: (_, g) => { cb.onMove(null); cb.onDrop(g.dy); }, // moveExercise clamps a drop past either end
    onPanResponderTerminate: () => cb.onMove(null),
  }));
  return (
    <View {...pan.panHandlers} accessible={false}
      style={{ alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 4, cursor: 'grab', touchAction: 'none' } as object}>
      <Ionicons name="reorder-three" size={26} color={c.muted} />
    </View>
  );
}
