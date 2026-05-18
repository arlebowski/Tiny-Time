import React from 'react';
import { View, Text, Pressable, Image, Platform } from 'react-native';
import ChevronRightIcon from '../../../components/icons/ChevronRightIcon';
import { PlusIcon, PaletteIcon, FamilyIcon } from '../../../components/icons';

export default function FamilyHubSubscreen({
  s,
  Card,
  colors,
  activeTheme,
  currentUser,
  familyInfo,
  members,
  families = [],
  familyId,
  setFamilyId,
  showDevSetupToggle,
  forceSetupPreview,
  forceLoginPreview,
  forceTooltipPreview,
  onToggleForceSetupPreview,
  onToggleForceLoginPreview,
  onToggleForceTooltipPreview,
  onDevShowCommunityModal,
  onDevShowPartnerModal,
  onOpenProfile,
  onOpenAppearance,
  onOpenFamily,
  onOpenAddFamily,
  radius,
  deletedFamilies = [],
  onUndoDeleteFamily,
  onDismissDeletedFamily,
}) {
  const cardRadius = radius?.xl ?? 12;
  const androidHubTitleTight = Platform.OS === 'android' ? { includeFontPadding: false } : null;
  const androidHubSubtitleTight = Platform.OS === 'android' ? { includeFontPadding: false } : null;
  return (
    <>
      <View style={s.familyHubHeader}>
        <View style={s.familyHubHeaderRow}>
          <Text style={[s.profileHeaderMonthLabel, { color: colors.textPrimary }]}>Account & Appearance</Text>
          {showDevSetupToggle ? (
            <View style={s.devToggleRow}>
              <Pressable
                onPress={() => onToggleForceSetupPreview?.(!forceSetupPreview)}
                style={({ pressed }) => [
                  s.devSetupToggle,
                  {
                    borderColor: forceSetupPreview ? colors.brandIcon : (colors.cardBorder || colors.borderSubtle),
                    backgroundColor: forceSetupPreview ? colors.subtleSurface : colors.cardBg,
                  },
                  pressed && s.devSetupTogglePressed,
                ]}
              >
                <Text style={[s.devSetupToggleText, { color: forceSetupPreview ? colors.brandIcon : colors.textTertiary }]}>OB</Text>
              </Pressable>
              <Pressable
                onPress={() => onToggleForceLoginPreview?.(!forceLoginPreview)}
                style={({ pressed }) => [
                  s.devSetupToggle,
                  {
                    borderColor: forceLoginPreview ? colors.brandIcon : (colors.cardBorder || colors.borderSubtle),
                    backgroundColor: forceLoginPreview ? colors.subtleSurface : colors.cardBg,
                  },
                  pressed && s.devSetupTogglePressed,
                ]}
              >
                <Text style={[s.devSetupToggleText, { color: forceLoginPreview ? colors.brandIcon : colors.textTertiary }]}>LG</Text>
              </Pressable>
              <Pressable
                onPress={() => onToggleForceTooltipPreview?.(!forceTooltipPreview)}
                style={({ pressed }) => [
                  s.devSetupToggle,
                  {
                    borderColor: forceTooltipPreview ? colors.brandIcon : (colors.cardBorder || colors.borderSubtle),
                    backgroundColor: forceTooltipPreview ? colors.subtleSurface : colors.cardBg,
                  },
                  pressed && s.devSetupTogglePressed,
                ]}
              >
                <Text style={[s.devSetupToggleText, { color: forceTooltipPreview ? colors.brandIcon : colors.textTertiary }]}>TT</Text>
              </Pressable>
              <Pressable
                onPress={() => onDevShowCommunityModal?.()}
                style={({ pressed }) => [
                  s.devSetupToggle,
                  {
                    borderColor: colors.cardBorder || colors.borderSubtle,
                    backgroundColor: colors.cardBg,
                  },
                  pressed && s.devSetupTogglePressed,
                ]}
              >
                <Text style={[s.devSetupToggleText, { color: colors.textTertiary }]}>CM</Text>
              </Pressable>
              <Pressable
                onPress={() => onDevShowPartnerModal?.()}
                style={({ pressed }) => [
                  s.devSetupToggle,
                  {
                    borderColor: colors.cardBorder || colors.borderSubtle,
                    backgroundColor: colors.cardBg,
                  },
                  pressed && s.devSetupTogglePressed,
                ]}
              >
                <Text style={[s.devSetupToggleText, { color: colors.textTertiary }]}>PI</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <Card onPress={onOpenProfile} style={{ borderRadius: cardRadius }}>
        <View style={s.appearanceEntryRow}>
          <View style={s.appearanceEntryLeft}>
            {currentUser.photoURL ? (
              <Image source={{ uri: currentUser.photoURL }} style={s.appearanceAccountAvatar} />
            ) : (
              <View style={[s.appearanceAccountAvatarFallback, { backgroundColor: colors.subtleSurface }]}>
                <Text style={[s.appearanceAccountAvatarInitial, { color: colors.textPrimary }]}>
                  {(currentUser.displayName || currentUser.email || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={[s.appearanceEntryTitle, androidHubTitleTight, { color: colors.textPrimary }]}>{currentUser.displayName || 'User'}</Text>
              <Text style={[s.appearanceEntrySubtitle, androidHubSubtitleTight, { color: colors.textSecondary }]}>{currentUser.email}</Text>
            </View>
          </View>
          <View style={s.appearanceEntryRight}>
            <ChevronRightIcon size={20} color={colors.textTertiary} />
          </View>
        </View>
      </Card>

      <Card style={[s.cardGap, { borderRadius: cardRadius }]} onPress={onOpenAppearance}>
        <View style={s.appearanceEntryRow}>
          <View style={s.appearanceEntryLeft}>
            <View style={s.appearanceEntryIcon}>
              <PaletteIcon size={24} color={colors.textPrimary} />
            </View>
            <View>
              <Text style={[s.appearanceEntryTitle, androidHubTitleTight, { color: colors.textPrimary }]}>Appearance</Text>
              <Text style={[s.appearanceEntrySubtitle, androidHubSubtitleTight, { color: colors.textSecondary }]}>Theme & dark mode</Text>
            </View>
          </View>
          <View style={s.appearanceEntryRight}>
            <View style={s.appearancePreviewDots}>
              {['bottle', 'nursing', 'sleep'].map((cardKey) => (
                <View
                  key={`preview-${cardKey}`}
                  style={[s.appearancePreviewDot, { backgroundColor: activeTheme?.[cardKey]?.primary || colors.textTertiary }]}
                />
              ))}
            </View>
            <ChevronRightIcon size={20} color={colors.textTertiary} />
          </View>
        </View>
      </Card>

      {deletedFamilies.filter((e) => Date.now() - (e.deletedAt || 0) < 30 * 24 * 60 * 60 * 1000).slice(0, 3).map((entry) => (
        <View
          key={entry.familyId}
          style={[s.cardGap, {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.subtleSurface || colors.inputBg,
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 14,
          }]}
        >
          <Text style={[{ flex: 1, fontSize: 13 }, { color: colors.textSecondary }]}>
            <Text style={{ color: colors.textPrimary }}>{entry.name || 'Family'}</Text>
            {' deleted · '}
            <Text
              onPress={() => onUndoDeleteFamily?.(entry.familyId)}
              style={{ color: colors.primaryBrand || colors.textPrimary, fontWeight: '600' }}
            >
              Undo
            </Text>
          </Text>
          <Pressable
            onPress={() => onDismissDeletedFamily?.(entry.familyId)}
            style={({ pressed }) => [{ padding: 4, opacity: pressed ? 0.5 : 1 }]}
            accessibilityLabel="Dismiss"
          >
            <Text style={{ fontSize: 16, color: colors.textTertiary }}>✕</Text>
          </Pressable>
        </View>
      ))}

      <View style={s.familyHubHeader}>
        <Text style={[s.profileHeaderMonthLabel, { color: colors.textPrimary }]}>My Families</Text>
      </View>

      {families.length > 0 ? (
        families.map((fam, index) => {
          const isCurrent = fam.familyId === familyId;
          const displayName = String(fam.name || '').trim() || 'Family';
          return (
            <Card
              key={fam.familyId}
              style={[index > 0 && s.cardGap, { borderRadius: cardRadius }]}
              onPress={isCurrent
                ? () => onOpenFamily?.()
                : async () => { if (typeof setFamilyId === 'function') await setFamilyId(fam.familyId); }
              }
            >
              <View style={s.appearanceEntryRow}>
                <View style={s.appearanceEntryLeft}>
                  <View style={s.appearanceEntryIcon}>
                    <FamilyIcon size={24} color={colors.textPrimary} />
                  </View>
                  <View>
                    <Text style={[s.appearanceEntryTitle, androidHubTitleTight, { color: colors.textPrimary }]}>{displayName}</Text>
                    <Text style={[s.appearanceEntrySubtitle, androidHubSubtitleTight, { color: colors.textSecondary }]}>
                      {isCurrent
                        ? `${members.length} ${members.length === 1 ? 'person' : 'people'} with access`
                        : 'Tap to switch'}
                    </Text>
                  </View>
                </View>
                <View style={s.appearanceEntryRight}>
                  {isCurrent ? (
                    <>
                      <View style={s.hubKidActiveBadge}>
                        <Text style={s.hubKidActiveBadgeText}>Active</Text>
                      </View>
                      <ChevronRightIcon size={20} color={colors.textTertiary} />
                    </>
                  ) : (
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.textTertiary }} />
                  )}
                </View>
              </View>
            </Card>
          );
        })
      ) : (
        <Card onPress={onOpenFamily} style={{ borderRadius: cardRadius }}>
          <View style={s.appearanceEntryRow}>
            <View style={s.appearanceEntryLeft}>
              <View style={s.appearanceEntryIcon}>
                <FamilyIcon size={24} color={colors.textPrimary} />
              </View>
              <View>
                <Text style={[s.appearanceEntryTitle, androidHubTitleTight, { color: colors.textPrimary }]}>{String(familyInfo?.name || '').trim() || 'Family'}</Text>
                <Text style={[s.appearanceEntrySubtitle, androidHubSubtitleTight, { color: colors.textSecondary }]}>
                  {`${members.length} ${members.length === 1 ? 'person' : 'people'} with access`}
                </Text>
              </View>
            </View>
            <View style={s.appearanceEntryRight}>
              <View style={s.hubKidActiveBadge}>
                <Text style={s.hubKidActiveBadgeText}>Active</Text>
              </View>
              <ChevronRightIcon size={20} color={colors.textTertiary} />
            </View>
          </View>
        </Card>
      )}

      <Card style={[s.cardGap, { borderRadius: cardRadius }]} onPress={onOpenAddFamily}>
        <View style={s.appearanceEntryRow}>
          <View style={s.appearanceEntryLeft}>
            <View style={[s.addChildIconWrap, { backgroundColor: colors.inputBg }]}>
              <PlusIcon size={20} color={colors.textPrimary} />
            </View>
            <View>
              <Text style={[s.appearanceEntryTitle, androidHubTitleTight, { color: colors.textPrimary }]}>Add or Join a Family</Text>
              <Text style={[s.appearanceEntrySubtitle, androidHubSubtitleTight, { color: colors.textSecondary }]}>Create or join another family</Text>
            </View>
          </View>
          <View style={s.appearanceEntryRight}>
            <ChevronRightIcon size={20} color={colors.textTertiary} />
          </View>
        </View>
      </Card>

      <View style={{ height: 40 }} />
    </>
  );
}
