import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import HalfSheet from './HalfSheet';
import SegmentedToggle from '../shared/SegmentedToggle';
import {
  BottleIcon,
  NursingIcon,
  SolidsIcon,
  MoonIcon,
  DiaperIcon,
} from '../icons';
import { useTheme } from '../../context/ThemeContext';
import {
  normalizeActivityVisibility,
  normalizeActivityOrder,
} from '../../constants/activityVisibility';

const DEFAULT_ROW_HEIGHT = 56;

const CONFIG = {
  bottle: { label: 'Bottle', Icon: BottleIcon, accentKey: 'bottle' },
  nursing: { label: 'Nursing', Icon: NursingIcon, accentKey: 'nursing' },
  solids: { label: 'Solids', Icon: SolidsIcon, accentKey: 'solids' },
  sleep: { label: 'Sleep', Icon: MoonIcon, accentKey: 'sleep' },
  diaper: { label: 'Diaper', Icon: DiaperIcon, accentKey: 'diaper' },
};

function DragDots({ color }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 256 256" fill={color}>
      <Path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60,12a12,12,0,1,0-12-12A12,12,0,0,0,164,72ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z" />
    </Svg>
  );
}

export default function ActivityVisibilitySheet({
  sheetRef,
  onClose,
  onOpen,
  visibility,
  order,
  onChange,
}) {
  const { colors, bottle, nursing, solids, sleep, diaper, isDark } = useTheme();
  const [draft, setDraft] = useState(() => normalizeActivityVisibility(visibility));
  const [draftOrder, setDraftOrder] = useState(() => normalizeActivityOrder(order));
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const accentByKey = useMemo(
    () => ({
      bottle: bottle.primary,
      nursing: nursing.primary,
      solids: solids.primary,
      sleep: sleep.primary,
      diaper: diaper.primary,
    }),
    [bottle.primary, nursing.primary, solids.primary, sleep.primary, diaper.primary]
  );

  const enabledCount = useMemo(() => Object.values(draft).filter(Boolean).length, [draft]);

  const resetDraft = useCallback(() => {
    setDraft(normalizeActivityVisibility(visibility));
    setDraftOrder(normalizeActivityOrder(order));
  }, [visibility, order]);

  useEffect(() => {
    if (isSheetOpen) return;
    setDraft(normalizeActivityVisibility(visibility));
    setDraftOrder(normalizeActivityOrder(order));
  }, [visibility, order, isSheetOpen]);

  const handleToggle = useCallback((key) => {
    if (!key) return;
    setDraft((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const nextEnabled = Object.values(next).filter(Boolean).length;
      return nextEnabled < 1 ? prev : next;
    });
  }, []);

  const handleDone = useCallback(() => {
    onChange?.({ visibility: draft, order: draftOrder });
    sheetRef?.current?.dismiss?.();
  }, [onChange, draft, draftOrder, sheetRef]);

  const onOffOptions = useMemo(
    () => ([
      {
        value: 'on',
        label: <Text style={styles.toggleLabelPad}>On</Text>,
      },
      {
        value: 'off',
        label: <Text style={styles.toggleLabelPad}>Off</Text>,
      },
    ]),
    []
  );

  const trackColor = isDark ? colors.appBg : colors.inputBg;
  const listData = useMemo(() => draftOrder.map((key) => ({ key })), [draftOrder]);

  const renderItem = useCallback(({ item, drag, isActive }) => {
    const key = item.key;
    const cfg = CONFIG[key];
    if (!cfg) return null;
    const Icon = cfg.Icon;
    const color = accentByKey[cfg.accentKey] || colors.textPrimary;
    const isLastEnabled = enabledCount === 1 && draft[key];
    const toggleValue = draft[key] ? 'on' : 'off';

    return (
      <ScaleDecorator activeScale={1.02}>
        <View
          style={[
            styles.row,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.cardBorder || colors.borderSubtle,
              opacity: isLastEnabled ? 0.5 : 1,
            },
            isActive && styles.activeRow,
          ]}
        >
          <View style={styles.left}>
            <Pressable
              style={styles.dragHandle}
              onPressIn={drag}
              hitSlop={8}
            >
              <DragDots color={colors.textTertiary} />
            </Pressable>

            <View style={key === 'bottle' ? styles.bottleRotate : undefined}>
              <Icon size={22} color={color} />
            </View>
            <Text style={[styles.rowLabel, { color }]}>{cfg.label}</Text>
          </View>

          <SegmentedToggle
            value={toggleValue}
            options={onOffOptions}
            size="medium"
            variant="body"
            fullWidth={false}
            trackColor={trackColor}
            onChange={(nextValue) => {
              if (isLastEnabled && nextValue === 'off') return;
              if ((nextValue === 'on') !== draft[key]) {
                handleToggle(key);
              }
            }}
          />
        </View>
      </ScaleDecorator>
    );
  }, [
    accentByKey,
    colors.textPrimary,
    colors.cardBg,
    colors.cardBorder,
    colors.borderSubtle,
    colors.textTertiary,
    draft,
    enabledCount,
    onOffOptions,
    trackColor,
    handleToggle,
  ]);

  return (
    <HalfSheet
      sheetRef={sheetRef}
      onClose={() => {
        setIsSheetOpen(false);
        onClose?.();
      }}
      onOpen={() => {
        setIsSheetOpen(true);
        resetDraft();
        onOpen?.();
      }}
      title="Show & Hide Activities"
      accentColor={colors.primaryActionBg || colors.primaryBrand}
      headerTitleColor={colors.primaryActionText || colors.textOnAccent || '#fff'}
      headerIconColor={colors.primaryActionText || colors.textOnAccent || '#fff'}
      snapPoints={['85%', '90%']}
      enableDynamicSizing={true}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
      scrollable={false}
      footer={(
        <Pressable
          onPress={handleDone}
          style={({ pressed }) => [
            styles.doneBtn,
            { backgroundColor: colors.primaryActionBg || colors.primaryBrand },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.doneText, { color: colors.primaryActionText || colors.textOnAccent || '#fff' }]}>
            Done
          </Text>
        </Pressable>
      )}
    >
      <View style={styles.listWrap}>
        <DraggableFlatList
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          onDragEnd={({ data }) => setDraftOrder(data.map((item) => item.key))}
          activationDistance={0}
          autoscrollThreshold={24}
          autoscrollSpeed={60}
          scrollEnabled={false}
          contentContainerStyle={styles.rows}
          containerStyle={styles.rowsContainer}
        />
      </View>

      <Text style={[styles.hint, { color: colors.textTertiary }]}>
        At least one activity must stay on.
      </Text>
    </HalfSheet>
  );
}

const styles = StyleSheet.create({
  listWrap: {
    minHeight: (DEFAULT_ROW_HEIGHT + 8) * 5,
  },
  rowsContainer: {
    overflow: 'visible',
  },
  rows: {
    gap: 8,
  },
  row: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeRow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  dragHandle: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottleRotate: {
    transform: [{ rotate: '20deg' }],
  },
  rowLabel: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'SF-Pro',
  },
  hint: {
    fontSize: 12,
    paddingTop: 4,
    fontFamily: 'SF-Pro',
  },
  doneBtn: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'SF-Pro',
  },
  toggleLabelPad: {
    minWidth: 26,
    textAlign: 'center',
  },
});
