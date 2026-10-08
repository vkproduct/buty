import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, ScrollView, View } from 'react-native';

import { AnalysisView } from '@/components/analysis-view';
import { CompositionInput } from '@/components/composition-input';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/text';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAnalyze } from '@/lib/queries';
import { space } from '@/theme';

const MAX_LENGTH = 10_000;

/** Вкладка «Разбор»: состав текстом или фото → разбор по ингредиентам. */
export default function AnalyzeScreen() {
  const [text, setText] = useState('');
  const analyze = useAnalyze();
  const scrollRef = useRef<ScrollView>(null);
  const { status } = useAuth();

  const submit = (value = text) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    analyze.mutate(trimmed.slice(0, MAX_LENGTH), {
      onSuccess: () => setTimeout(() => scrollRef.current?.scrollTo({ y: 420, animated: true }), 150),
    });
  };

  return (
    <Screen
      tab
      ref={scrollRef}
      title="Разбор состава"
      subtitle="Вставьте состав с упаковки или сфотографируйте его — расскажем, что внутри, по данным исследований.">
      <View style={{ gap: space.md }}>
        <CompositionInput
          value={text}
          onChange={(t) => {
            setText(t);
            if (analyze.data || analyze.error) analyze.reset();
          }}
          onRecognized={(t) => submit(t)}
          error={analyze.error ? errorMessage(analyze.error) : null}
        />
        <Button
          title="Разобрать состав"
          icon="sparkle.magnifyingglass"
          disabled={!text.trim()}
          loading={analyze.isPending}
          onPress={() => submit()}
        />
        {text.length > MAX_LENGTH ? (
          <AppText variant="footnote" color="amber">
            Текст длиннее {MAX_LENGTH} символов — разберём только начало.
          </AppText>
        ) : null}
      </View>

      {analyze.data ? (
        <AnalysisView
          result={analyze.data}
          onAddToShelf={() =>
            status === 'signedIn'
              ? router.push({ pathname: '/add-to-shelf', params: { inci: text.trim().slice(0, MAX_LENGTH) } })
              : router.push('/sign-in')
          }
        />
      ) : null}
    </Screen>
  );
}
