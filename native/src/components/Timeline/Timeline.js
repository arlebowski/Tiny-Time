/**
 * Timeline — RN migration from web/components/shared/Timeline.js
 * Full migration: swipe row, delete modal, photo modal, sort icons, animations.
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  RefreshControl,
  Pressable,
  Modal,
  Image,
  StyleSheet,
  Platform,
  Share,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { THEME_TOKENS } from '../../../../shared/config/theme';
import TimelineItem from './TimelineItem';
import TimelineSwipeRow from './TimelineSwipeRow';
import SegmentedToggle from '../shared/SegmentedToggle';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'feed', label: 'Feed' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'diaper', label: 'Diaper' },
];
const TIMELINE_EASE = Easing.bezier(0.16, 0, 0, 1);
const DELETE_EXIT_DELAY_MS = 180;
const normalizePhotoUrls = (input) => {
  if (!input) return [];
  const items = Array.isArray(input) ? input : [input];
  const urls = [];
  for (const item of items) {
    if (typeof item === 'string' && item.trim()) {
      urls.push(item);
      continue;
    }
    if (item && typeof item === 'object') {
      const maybe =
        item.url ||
        item.publicUrl ||
        item.publicURL ||
        item.downloadURL ||
        item.downloadUrl ||
        item.src ||
        item.uri;
      if (typeof maybe === 'string' && maybe.trim()) {
        urls.push(maybe);
      }
    }
  }
  return urls;
};

// Sort asc icon (arrow up) - when desc, show this to switch to asc
const SortAscIcon = ({ size = 20, color }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
    <Path d="M40,128a8,8,0,0,1,8-8h72a8,8,0,0,1,0,16H48A8,8,0,0,1,40,128Zm8-56h56a8,8,0,0,0,0-16H48a8,8,0,0,0,0,16ZM184,184H48a8,8,0,0,0,0,16H184a8,8,0,0,0,0-16ZM229.66,82.34l-40-40a8,8,0,0,0-11.32,0l-40,40a8,8,0,0,0,11.32,11.32L176,67.31V144a8,8,0,0,0,16,0V67.31l26.34,26.35a8,8,0,0,0,11.32-11.32Z" />
  </Svg>
);
// Sort desc icon (arrow down) - when asc, show this to switch to desc
const SortDescIcon = ({ size = 20, color }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
    <Path d="M128,128a8,8,0,0,1-8,8H48a8,8,0,0,1,0-16h72A8,8,0,0,1,128,128ZM48,72H184a8,8,0,0,0,0-16H48a8,8,0,0,0,0,16Zm56,112H48a8,8,0,0,0,0,16h56a8,8,0,0,0,0-16Zm125.66-21.66a8,8,0,0,0-11.32,0L192,188.69V112a8,8,0,0,0-16,0v76.69l-26.34-26.35a8,8,0,0,0-11.32,11.32l40,40a8,8,0,0,0,11.32,0l40-40A8,8,0,0,0,229.66,162.34Z" />
  </Svg>
);

function EmptyState({ filter, colors }) {
  const messages = {
    all: 'No activity yet today.\nTap + to log a feeding, sleep, or diaper change.',
    feed: 'No feedings yet today.',
    sleep: 'No sleep sessions yet today.',
    diaper: 'No diaper changes yet today.',
  };
  const msg = messages[filter] || messages.all;
  return (
    <View style={[styles.emptyWrap, { backgroundColor: colors.appBg }]}>
      <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
        {filter === 'all' ? 'Nothing logged yet' : `No ${filter} entries`}
      </Text>
      <Text style={[styles.emptySub, { color: colors.textTertiary }]}>{msg}</Text>
    </View>
  );
}

function TimelineHeaderContent({ sortOrder, onSortPress, colors }) {
  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Timeline</Text>
      <View style={styles.headerRight}>
        <Pressable
          style={({ pressed }) => [
            styles.sortBtn,
            {
              backgroundColor: colors.segTrack || colors.track,
              borderColor: colors.cardBorder,
              transform: pressed ? [{ scale: 0.95 }] : [],
            },
          ]}
          onPress={onSortPress}
          accessibilityLabel={
            sortOrder === 'desc' ? 'Sort chronological' : 'Sort reverse chronological'
          }
        >
          {sortOrder === 'desc' ? (
            <SortAscIcon size={20} color={colors.textPrimary} />
          ) : (
            <SortDescIcon size={20} color={colors.textPrimary} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function Timeline({
  items = [],
  onRefresh,
  onEditCard,
  onDeleteCard,
  onActiveSleepClick,
  initialFilter = 'all',
  initialSortOrder = 'desc',
  onFilterChange,
  refreshing = false,
  refreshProgressOffset = 0,
  ListHeaderComponent,
  allowItemExpand = true,
  sleepSettings = null,
  hideFilter = false,
  suppressEmptyState = false,
}) {
  const { colors, isDark } = useTheme();
  const [filter, setFilter] = useState(initialFilter || 'all');
  const [sortOrder, setSortOrder] = useState(initialSortOrder || 'desc');

  // Sync filter when parent drives initialFilter changes (e.g. DetailScreen toggle)
  useEffect(() => {
    if (initialFilter && initialFilter !== filter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);
  const [expandedId, setExpandedId] = useState(null);
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [swipingCardId, setSwipingCardId] = useState(null);
  const [deletingCard, setDeletingCard] = useState(null);
  const [hiddenItemIds, setHiddenItemIds] = useState(() => new Set());
  const [fullSizePhoto, setFullSizePhoto] = useState(null);
  const hideTimersRef = useRef(new Map());

  const handleFilterChange = useCallback(
    (id) => {
      if (id === filter) return;
      setFilter(id);
      onFilterChange?.(id);
    },
    [filter, onFilterChange]
  );

  const handleSortPress = useCallback(() => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  }, []);

  const filteredItems = useMemo(() => {
    const filtered =
      filter === 'all' ? items : items.filter((item) => item.type === filter);
    const visible = filtered.filter((item) => !hiddenItemIds.has(item?.id));
    return [...visible].sort((a, b) => {
      const aMinutes = (a.hour ?? 0) * 60 + (a.minute ?? 0);
      const bMinutes = (b.hour ?? 0) * 60 + (b.minute ?? 0);
      const direction = sortOrder === 'asc' ? 1 : -1;
      return (aMinutes - bMinutes) * direction;
    });
  }, [items, filter, sortOrder, hiddenItemIds]);

  useEffect(() => {
    setOpenSwipeId(null);
  }, [filter, sortOrder, items]);

  useEffect(() => {
    const visibleIds = new Set((items || []).map((item) => item?.id).filter(Boolean));
    setHiddenItemIds((prev) => {
      let changed = false;
      const next = new Set();
      prev.forEach((id) => {
        if (visibleIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [items]);

  useEffect(
    () => () => {
      hideTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      hideTimersRef.current.clear();
    },
    []
  );

  const getHasDetails = useCallback((card) => {
    if (!card) return false;
    const photoList = card.photoURLs || card.photoUrls || card.photos;
    const hasPhotos = normalizePhotoUrls(photoList).length > 0;
    const hasNote = Boolean(card.note || card.notes);
    const isNursing = card.type === 'feed' && card.feedType === 'nursing';
    const isSolids = card.type === 'feed' && card.feedType === 'solids';
    return hasPhotos || hasNote || isNursing || isSolids;
  }, []);

  const handleItemPress = useCallback(
    (card) => {
      const hasDetails = getHasDetails(card);
      const isLogged = card?.variant === 'logged';
      if (!isLogged || !hasDetails || !allowItemExpand) return;
      setExpandedId((prev) => (prev === card.id ? null : card.id));
    },
    [getHasDetails, allowItemExpand]
  );

  const handleRowPrimaryPress = useCallback(
    (card) => {
      const isLogged = card?.variant === 'logged';
      if (isLogged) {
        onEditCard?.(card);
        return;
      }
      handleItemPress(card);
    },
    [handleItemPress, onEditCard]
  );

  const handleDeleteCard = useCallback((card) => {
    setDeletingCard(card);
  }, []);

  const confirmDelete = useCallback(async () => {
    const card = deletingCard;
    if (!card) return;
    const cardId = card.id;

    // Close modal immediately and hide the item instantly for snappier UX.
    setDeletingCard(null);
    if (cardId) {
      const existing = hideTimersRef.current.get(cardId);
      if (existing) clearTimeout(existing);
      const timerId = setTimeout(() => {
        setHiddenItemIds((prev) => {
          const next = new Set(prev);
          next.add(cardId);
          return next;
        });
        hideTimersRef.current.delete(cardId);
      }, DELETE_EXIT_DELAY_MS);
      hideTimersRef.current.set(cardId, timerId);
    }

    if (typeof onDeleteCard !== 'function') return;
    const didDelete = await onDeleteCard(card);
    if (didDelete === false && cardId) {
      const pending = hideTimersRef.current.get(cardId);
      if (pending) {
        clearTimeout(pending);
        hideTimersRef.current.delete(cardId);
      }
      setHiddenItemIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }
  }, [deletingCard, onDeleteCard]);

  const handlePhotoClick = useCallback((url) => {
    setFullSizePhoto(url);
  }, []);

  const handleSharePhoto = useCallback(async () => {
    if (!fullSizePhoto) return;
    try {
      await Share.share({
        message: fullSizePhoto,
        url: fullSizePhoto,
        title: 'Photo',
      });
    } catch (e) {
      // User cancelled or error
    }
  }, [fullSizePhoto]);

  const renderItem = useCallback(
    ({ item }) => {
      const hasDetails = getHasDetails(item);
      const isExpanded = expandedId === item.id;
      const isLogged = item?.variant === 'logged';
      const cardContent = (
        <TimelineItem
          card={item}
          isExpanded={isExpanded}
          hasDetails={hasDetails}
          onChevronPress={() => handleItemPress(item)}
          onActiveSleepClick={onActiveSleepClick}
          onPhotoClick={handlePhotoClick}
          sleepSettings={sleepSettings}
          allowItemExpand={allowItemExpand}
        />
      );
      return (
        <Animated.View
          entering={FadeInDown
            .duration(90)
            .easing(Easing.out(Easing.cubic))}
          exiting={FadeOut
            .duration(180)
            .easing(Easing.in(Easing.cubic))}
        >
          <TimelineSwipeRow
            card={item}
            isSwipeEnabled={isLogged}
            onEdit={onEditCard}
            onDelete={handleDeleteCard}
            onRowPress={() => handleRowPrimaryPress(item)}
            openSwipeId={openSwipeId}
            setOpenSwipeId={setOpenSwipeId}
            onSwipeStart={setSwipingCardId}
            onSwipeEnd={() => setSwipingCardId(null)}
          >
            {cardContent}
          </TimelineSwipeRow>
        </Animated.View>
      );
    },
    [
      expandedId,
      getHasDetails,
      handleItemPress,
      handleRowPrimaryPress,
      handleDeleteCard,
      handlePhotoClick,
      onActiveSleepClick,
      onEditCard,
      openSwipeId,
      allowItemExpand,
      sleepSettings,
    ]
  );

  const keyExtractor = useCallback(
    (item, index) =>
      String(
        item.id ??
          `${item.type || 'item'}-${item.timeMs ?? ''}-${item.hour ?? ''}-${item.minute ?? ''}-${index}`
      ),
    []
  );

  const timelineHeader = useMemo(
    () => (
      <>
        <TimelineHeaderContent
          sortOrder={sortOrder}
          onSortPress={handleSortPress}
          colors={colors}
        />
        {!hideFilter && (
          <SegmentedToggle
            options={FILTER_OPTIONS}
            value={filter}
            onChange={handleFilterChange}
            style={styles.filter}
          />
        )}
      </>
    ),
    [filter, sortOrder, colors, handleFilterChange, handleSortPress, hideFilter]
  );

  const ListHeaderComponentMerged = useMemo(
    () =>
      ListHeaderComponent ? (
        <>
          {ListHeaderComponent}
          {timelineHeader}
        </>
      ) : (
        timelineHeader
      ),
    [ListHeaderComponent, timelineHeader]
  );

  const ListEmptyComponent = useMemo(
    () => <EmptyState filter={filter} colors={colors} />,
    [filter, colors]
  );
  const shouldShowEmptyState = filteredItems.length === 0 && !suppressEmptyState;

  return (
    <View style={[styles.container, { backgroundColor: colors.appBg }]}>
      <Animated.FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemLayoutAnimation={
          swipingCardId || hiddenItemIds.size > 0
            ? undefined
            : LinearTransition.duration(300).easing(TIMELINE_EASE)
        }
        ListHeaderComponent={ListHeaderComponentMerged}
        ListEmptyComponent={shouldShowEmptyState ? ListEmptyComponent : null}
        contentContainerStyle={[
          styles.listContent,
          shouldShowEmptyState && styles.listContentEmpty,
        ]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brandIcon ?? (isDark ? '#FF99AA' : '#FF4D79')}
              colors={Platform.OS === 'android' ? [colors.brandIcon ?? (isDark ? '#FF99AA' : '#FF4D79')] : undefined}
              progressBackgroundColor={Platform.OS === 'android' ? colors.appBg : undefined}
              title="Refreshing..."
              titleColor={colors.textSecondary}
              progressViewOffset={refreshProgressOffset}
            />
          ) : undefined
        }
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => setOpenSwipeId(null)}
      />

      {/* Delete confirmation modal */}
      {deletingCard && (
        <Modal
          visible={!!deletingCard}
          transparent
          animationType="fade"
          onRequestClose={() => setDeletingCard(null)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setDeletingCard(null)}
          >
            <Pressable
              style={[styles.deleteModal, { backgroundColor: colors.timelineItemBg || colors.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[styles.deleteTitle, { color: colors.textPrimary }]}>
                Delete {deletingCard.type === 'feed' ? 'Feeding' : deletingCard.type === 'diaper' ? 'Diaper change' : 'Sleep'}?
              </Text>
              <Text style={[styles.deleteMessage, { color: colors.textSecondary }]}>
                Are you sure you want to delete this {deletingCard.type === 'feed' ? 'feeding' : deletingCard.type === 'diaper' ? 'diaper change' : 'sleep'} at {deletingCard.time}?
              </Text>
              <View style={styles.deleteActions}>
                <Pressable
                  style={[styles.deleteBtn, styles.cancelBtn, { backgroundColor: colors.subtleSurface ?? colors.subtle }]}
                  onPress={() => setDeletingCard(null)}
                >
                  <Text style={[styles.deleteBtnText, { color: colors.textPrimary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.deleteBtn, styles.confirmBtn, { backgroundColor: colors.error }]}
                  onPress={confirmDelete}
                >
                  <Text style={[styles.deleteBtnText, { color: colors.textOnAccent }]}>Delete</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Full-size photo modal */}
      {fullSizePhoto && (
        <Modal
          visible={!!fullSizePhoto}
          transparent
          animationType="fade"
          onRequestClose={() => setFullSizePhoto(null)}
        >
          <Pressable
            style={styles.photoModalOverlay}
            onPress={() => setFullSizePhoto(null)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Image
                source={{ uri: fullSizePhoto }}
                style={styles.photoModalImage}
                resizeMode="contain"
              />
            </Pressable>
            <View style={styles.photoModalActions}>
              <Pressable
                style={styles.photoModalBtn}
                onPress={handleSharePhoto}
              >
                <Text style={styles.photoModalBtnText}>Share</Text>
              </Pressable>
              <Pressable
                style={styles.photoModalBtn}
                onPress={() => setFullSizePhoto(null)}
              >
                <Text style={styles.photoModalBtnText}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: FWB.semibold,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filter: {
    marginBottom: 16,
  },
  emptyWrap: {
    flex: 1,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FWB.semibold,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
  },
  deleteTitle: {
    fontSize: 20,
    fontFamily: FWB.semibold,
    marginBottom: 8,
  },
  deleteMessage: {
    fontSize: 16,
    marginBottom: 24,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {},
  confirmBtn: {},
  deleteBtnText: {
    fontSize: 16,
    fontFamily: FWB.semibold,
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  photoModalImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
  },
  photoModalActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  photoModalBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  photoModalBtnText: {
    fontSize: 16,
    fontFamily: FWB.semibold,
    color: '#fff',
  },
});
