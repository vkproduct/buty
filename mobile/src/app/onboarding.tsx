import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Segmented } from '@/components/ui/segmented';
import { Loading } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/api';
import { useDictionaries, useMe, useSaveSkinProfile } from '@/lib/queries';
import type { Dictionaries, Option, SkinProfile } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

const STEPS = ['Тип кожи', 'Задачи', 'Особые периоды', 'Реакции', 'Проверка'] as const;
type Level = 'allergy' | 'intolerance';

function OptionCard({
  option,
  selected,
  onPress,
  multi,
}: {
  option: Option;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { backgroundColor: c.card, borderColor: selected ? c.brand : c.hair, opacity: pressed ? 0.8 : 1 },
      ]}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="headline">{option.label}</AppText>
        {option.hint ? (
          <AppText variant="footnote" color="muted">
            {option.hint}
          </AppText>
        ) : null}
      </View>
      <Icon
        name={selected ? (multi ? 'checkmark.square.fill' : 'checkmark.circle.fill') : multi ? 'square' : 'circle'}
        color={selected ? c.brand : c.faint}
        size={22}
      />
    </Pressable>
  );
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/** Анкета профиля кожи: 5 шагов, как на сайте (с медицинской ревизией). */
export default function OnboardingScreen() {
  const dict = useDictionaries();
  const me = useMe();
  const sp = dict.data?.skinProfile;
  if (!sp || me.isPending) return <Loading />;
  return <Wizard sp={sp} profile={me.data?.profile ?? null} />;
}

function Wizard({ sp, profile }: { sp: Dictionaries['skinProfile']; profile: SkinProfile | null }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const save = useSaveSkinProfile();

  // Анкета заполняется сохранённым профилем; согласие уже было — сразу к проверке
  const resume = Boolean(profile?.healthConsentAt);
  const [step, setStep] = useState(resume ? 4 : 0);
  const [reviewReturn, setReviewReturn] = useState(false);
  const [skinType, setSkinType] = useState<string | null>(
    profile && profile.skinType !== 'sensitive' ? profile.skinType : null,
  );
  const [showQuiz, setShowQuiz] = useState(false);
  const [sensitive, setSensitive] = useState(Boolean(profile?.sensitive || profile?.skinType === 'sensitive'));
  const [concerns, setConcerns] = useState<string[]>(profile?.concerns ?? []);
  const [conditions, setConditions] = useState<string[]>(profile?.conditions ?? []);
  const [levels, setLevels] = useState<Record<string, Level>>(() => ({
    ...Object.fromEntries((profile?.intolerances ?? []).map((a) => [a, 'intolerance' as const])),
    ...Object.fromEntries((profile?.allergies ?? []).map((a) => [a, 'allergy' as const])),
  }));
  const [custom, setCustom] = useState('');
  const [consent, setConsent] = useState(resume);
  const [error, setError] = useState<string | null>(null);

  const labelOf = useMemo(() => {
    const map = new Map<string, string>();
    [
      ...sp.skinTypes,
      ...sp.conditions,
      ...sp.concernGroups.flatMap((g) => g.options),
      ...sp.allergenGroups.flatMap((g) => g.options),
    ].forEach((o) => map.set(o.id, o.label));
    return (id: string) => map.get(id) ?? id;
  }, [sp]);

  const defaultLevel = new Map(sp.allergenGroups.flatMap((g) => g.options).map((o) => [o.id, o.defaultLevel]));

  const go = (next: number) => {
    setError(null);
    if (step === 0 && next > 0 && !skinType) {
      setError('Выберите тип кожи или нажмите «Не знаю»');
      return;
    }
    setStep(reviewReturn && next > step ? 4 : next);
    if (reviewReturn && next > step) setReviewReturn(false);
  };

  const submit = () => {
    if (!consent) {
      setError('Чтобы сохранить профиль, нужно согласие.');
      return;
    }
    save.mutate(
      {
        skinType: skinType!,
        sensitive,
        concerns,
        conditions,
        allergies: Object.keys(levels).filter((k) => levels[k] === 'allergy'),
        intolerances: Object.keys(levels).filter((k) => levels[k] === 'intolerance'),
        consent: true,
      },
      {
        onSuccess: () => router.back(),
        onError: (e) => Alert.alert('Не сохранилось', errorMessage(e)),
      },
    );
  };

  const edit = (target: number) => {
    setReviewReturn(true);
    setStep(target);
  };

  const selectedReactions = Object.keys(levels);

  return (
    <View style={{ flex: 1, backgroundColor: c.grouped }}>
      <View style={[styles.progressTrack, { backgroundColor: c.hair }]}>
        <View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%`, backgroundColor: c.brand }]} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ gap: space.xs }}>
          <AppText variant="footnote" color="muted">
            Шаг {step + 1} из {STEPS.length}
          </AppText>
          <AppText variant="title2" accessibilityRole="header">
            {STEPS[step]}
          </AppText>
        </View>

        {step === 0 ? (
          <View style={{ gap: space.md }}>
            {sp.skinTypes.map((t) => (
              <OptionCard key={t.id} option={t} selected={skinType === t.id} onPress={() => setSkinType(t.id)} />
            ))}
            <Button title={showQuiz ? 'Скрыть подсказку' : 'Не знаю свой тип'} variant="plain" onPress={() => setShowQuiz(!showQuiz)} />
            {showQuiz ? (
              <View style={{ gap: space.sm }}>
                <AppText variant="subhead" color="textSoft">
                  Умойтесь мягким средством и ничего не наносите 2–3 часа. Как ощущается кожа?
                </AppText>
                {sp.skinTypeQuiz.map((q) => (
                  <Chip
                    key={q.answer}
                    label={q.answer}
                    selected={skinType === q.type}
                    onPress={() => {
                      setSkinType(q.type);
                      setShowQuiz(false);
                    }}
                  />
                ))}
              </View>
            ) : null}
            <View style={[styles.switchRow, { backgroundColor: c.card }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="headline">Кожа чувствительная</AppText>
                <AppText variant="footnote" color="muted">
                  Легко краснеет, щиплет от новых средств. Бывает при любом типе кожи.
                </AppText>
              </View>
              <Switch value={sensitive} onValueChange={setSensitive} trackColor={{ true: c.brand }} />
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ gap: space.lg }}>
            {sp.concernGroups.map((g) => (
              <View key={g.title} style={{ gap: space.sm }}>
                <AppText variant="headline">{g.title}</AppText>
                {g.note ? (
                  <AppText variant="footnote" color="muted">
                    {g.note}
                  </AppText>
                ) : null}
                <View style={styles.wrap}>
                  {g.options.map((o) => (
                    <Chip key={o.id} label={o.label} selected={concerns.includes(o.id)} onPress={() => setConcerns(toggle(concerns, o.id))} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: space.md }}>
            <AppText variant="subhead" color="muted">
              Учтём при проверке средств: например, отметим ретиноиды при беременности.
            </AppText>
            {sp.conditions.map((o) => (
              <OptionCard key={o.id} multi option={o} selected={conditions.includes(o.id)} onPress={() => setConditions(toggle(conditions, o.id))} />
            ))}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={{ gap: space.lg }}>
            <AppText variant="subhead" color="muted">
              Отметьте, на что уже была реакция. Аллергия — зуд, сыпь, отёк; раздражение — жжение и покраснение.
            </AppText>
            {sp.allergenGroups.map((g) => (
              <View key={g.title} style={{ gap: space.sm }}>
                <AppText variant="headline">{g.title}</AppText>
                <View style={styles.wrap}>
                  {g.options.map((o) => (
                    <Chip
                      key={o.id}
                      label={o.label}
                      selected={o.id in levels}
                      onPress={() =>
                        setLevels((prev) => {
                          const next = { ...prev };
                          if (o.id in next) delete next[o.id];
                          else next[o.id] = o.defaultLevel;
                          return next;
                        })
                      }
                    />
                  ))}
                </View>
              </View>
            ))}
            <View style={{ gap: space.sm }}>
              <AppText variant="headline">Своё</AppText>
              <View style={styles.customRow}>
                <View style={{ flex: 1 }}>
                  <TextField
                    value={custom}
                    onChangeText={setCustom}
                    placeholder="Например, масло ши"
                    maxLength={sp.maxCustomLength}
                    returnKeyType="done"
                  />
                </View>
                <Button
                  title="Добавить"
                  size="small"
                  variant="secondary"
                  disabled={!custom.trim()}
                  onPress={() => {
                    const value = custom.trim().replace(/\s+/g, ' ');
                    if (value) setLevels((prev) => ({ ...prev, [value]: 'allergy' }));
                    setCustom('');
                  }}
                />
              </View>
            </View>
            {selectedReactions.length ? (
              <View style={{ gap: space.sm }}>
                <AppText variant="headline">Как реагирует кожа</AppText>
                {selectedReactions.map((id) => (
                  <View key={id} style={[styles.levelRow, { backgroundColor: c.card }]}>
                    <AppText variant="subhead" style={{ flex: 1 }} numberOfLines={2}>
                      {labelOf(id)}
                    </AppText>
                    <View style={{ width: 200 }}>
                      <Segmented
                        options={[
                          { id: 'allergy', label: 'Аллергия' },
                          { id: 'intolerance', label: 'Раздражение' },
                        ]}
                        value={levels[id] ?? defaultLevel.get(id) ?? 'allergy'}
                        onChange={(lvl) => setLevels((prev) => ({ ...prev, [id]: lvl }))}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {step === 4 ? (
          <View style={{ gap: space.md }}>
            {[
              {
                title: 'Тип кожи',
                value: `${skinType ? labelOf(skinType) : 'не выбран'}${sensitive ? ', чувствительная' : ''}`,
                step: 0,
              },
              { title: 'Задачи', value: concerns.map(labelOf).join(', ') || 'не указаны', step: 1 },
              { title: 'Особые периоды', value: conditions.map(labelOf).join(', ') || 'нет', step: 2 },
              {
                title: 'Реакции',
                value:
                  selectedReactions
                    .map((id) => `${labelOf(id)} (${levels[id] === 'allergy' ? 'аллергия' : 'раздражение'})`)
                    .join(', ') || 'нет',
                step: 3,
              },
            ].map((row) => (
              <View key={row.title} style={[styles.reviewRow, { backgroundColor: c.card }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="footnote" color="muted">
                    {row.title}
                  </AppText>
                  <AppText variant="subhead">{row.value}</AppText>
                </View>
                <AppText variant="subhead" color="brand" accessibilityRole="button" onPress={() => edit(row.step)}>
                  Изменить
                </AppText>
              </View>
            ))}
            <AppText variant="footnote" color="muted">
              Buty не ставит диагнозы и не заменяет врача. При розацеа, атопическом дерматите, беременности и лечении у
              дерматолога согласуйте уход со специалистом.
            </AppText>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }}
              onPress={() => {
                setConsent(!consent);
                setError(null);
              }}
              style={styles.consent}>
              <Icon name={consent ? 'checkmark.square.fill' : 'square'} color={consent ? c.brand : c.faint} size={24} />
              <AppText variant="subhead" style={{ flex: 1 }}>
                Согласна(ен) на обработку данных о состоянии кожи, аллергиях и особых периодах, чтобы Buty
                персонализировал разборы составов. Данные видны только вам; профиль можно изменить или удалить в разделе
                «Профиль».
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md, backgroundColor: c.background, borderTopColor: c.hair }]}>
        {error ? (
          <AppText variant="footnote" color="coral" accessibilityLiveRegion="assertive">
            {error}
          </AppText>
        ) : null}
        <View style={styles.footerRow}>
          {step > 0 && !reviewReturn ? (
            <Button title="Назад" variant="secondary" onPress={() => go(step - 1)} style={{ flex: 1 }} />
          ) : null}
          {step < 4 ? (
            <Button
              title={reviewReturn ? 'Готово' : (step === 2 && !conditions.length) || (step === 3 && !selectedReactions.length) || (step === 1 && !concerns.length) ? 'Пропустить' : 'Далее'}
              onPress={() => go(step + 1)}
              style={{ flex: 2 }}
            />
          ) : (
            <Button title="Сохранить профиль" loading={save.isPending} onPress={submit} style={{ flex: 2 }} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: { height: 3 },
  progressFill: { height: 3 },
  content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl * 2 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    minHeight: 56,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.md },
  consent: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', paddingVertical: space.sm },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  footerRow: { flexDirection: 'row', gap: space.sm },
});
