import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { IngredientRow } from '@/components/ingredient-row';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Segmented } from '@/components/ui/segmented';
import { EmptyState, ErrorState, Loading } from '@/components/ui/states';
import { AppText } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/api';
import { pluralRu } from '@/lib/format';
import { useDictionaries, useIngredientList, useProductList } from '@/lib/queries';
import type { IngredientListItem, ProductListItem } from '@/lib/types';
import { useDebounced } from '@/lib/use-debounced';
import { radius, space, useColors } from '@/theme';

type Mode = 'ingredients' | 'products';

function ProductRow({ item }: { item: ProductListItem }) {
  const c = useColors();
  const dict = useDictionaries().data;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/product/[slug]', params: { slug: item.slug } })}
      style={({ pressed }) => [styles.productRow, pressed && { backgroundColor: c.fill }]}>
      <View style={[styles.productInner, { borderBottomColor: c.line }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="footnote" color="muted" weight="600">
            {item.brand}
          </AppText>
          <AppText variant="headline" numberOfLines={2}>
            {item.name}
          </AppText>
          <AppText variant="footnote" color="muted">
            {dict?.productCategories[item.category] ?? item.category} · {item.ingredientsCount}{' '}
            {pluralRu(item.ingredientsCount, 'ингредиент', 'ингредиента', 'ингредиентов')}
          </AppText>
        </View>
        <Icon name="chevron.right" color={c.faint} size={13} weight="semibold" />
      </View>
    </Pressable>
  );
}

/** Вкладка «Каталог»: ингредиенты и средства с поиском и фильтром по категории. */
export default function CatalogScreen() {
  const c = useColors();
  const dict = useDictionaries().data;
  const [mode, setMode] = useState<Mode>('ingredients');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const q = useDebounced(query.trim());

  const ingredients = useIngredientList({ q, category: category ? [category] : undefined }, mode === 'ingredients');
  const products = useProductList({ q, category: category ? [category] : undefined }, mode === 'products');
  const active = mode === 'ingredients' ? ingredients : products;

  const firstPage = active.data?.pages[0];
  const items = useMemo(
    () => (active.data?.pages ?? []).flatMap((p) => p.items as (IngredientListItem | ProductListItem)[]),
    [active.data],
  );
  const categories = firstPage?.categories ?? [];
  const labels = mode === 'ingredients' ? dict?.ingredientCategories : dict?.productCategories;

  const header = (
    <View style={{ gap: space.md, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md }}>
      <AppText variant="largeTitle" accessibilityRole="header">
        Каталог
      </AppText>
      <Segmented
        options={[
          { id: 'ingredients', label: 'Ингредиенты' },
          { id: 'products', label: 'Средства' },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setCategory(null);
        }}
      />
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder={mode === 'ingredients' ? 'Ниацинамид, Retinol, витамин C…' : 'Бренд или название'}
        returnKeyType="search"
        clearButtonMode="while-editing"
        autoCorrect={false}
        accessibilityLabel="Поиск"
      />
      {categories.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          <Chip label="Все" selected={!category} onPress={() => setCategory(null)} />
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              label={labels?.[cat.id] ?? cat.id}
              count={cat.count}
              selected={category === cat.id}
              onPress={() => setCategory(category === cat.id ? null : cat.id)}
            />
          ))}
        </ScrollView>
      ) : null}
      {firstPage?.total !== undefined ? (
        <AppText variant="footnote" color="muted">
          {mode === 'ingredients'
            ? `${firstPage.total} ${pluralRu(firstPage.total, 'ингредиент', 'ингредиента', 'ингредиентов')}`
            : `${firstPage.total} ${pluralRu(firstPage.total, 'средство', 'средства', 'средств')}`}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: c.grouped }}
      contentInsetAdjustmentBehavior="automatic"
      data={items}
      keyExtractor={(item) => item.slug}
      ListHeaderComponent={header}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      renderItem={({ item, index }) => (
        <View
          style={[
            { backgroundColor: c.card, marginHorizontal: space.lg },
            index === 0 && styles.first,
            index === items.length - 1 && styles.last,
          ]}>
          {mode === 'ingredients' ? (
            <IngredientRow item={item as IngredientListItem} last={index === items.length - 1} />
          ) : (
            <ProductRow item={item as ProductListItem} />
          )}
        </View>
      )}
      onEndReachedThreshold={0.6}
      onEndReached={() => {
        if (active.hasNextPage && !active.isFetchingNextPage) void active.fetchNextPage();
      }}
      ListEmptyComponent={
        active.isPending ? (
          <Loading />
        ) : active.error ? (
          <ErrorState message={errorMessage(active.error)} onRetry={() => active.refetch()} />
        ) : (
          <EmptyState icon="magnifyingglass" title="Ничего не нашли" text="Попробуйте другое написание — по-русски или как в INCI." />
        )
      }
      ListFooterComponent={active.isFetchingNextPage ? <Loading /> : <View style={{ height: space.xxl }} />}
    />
  );
}

const styles = StyleSheet.create({
  first: { borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, overflow: 'hidden' },
  last: { borderBottomLeftRadius: radius.md, borderBottomRightRadius: radius.md, overflow: 'hidden' },
  productRow: { paddingLeft: space.lg },
  productInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    paddingRight: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
