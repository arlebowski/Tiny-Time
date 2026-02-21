import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
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
  showDevSetupToggle,
  forceSetupPreview,
  forceLoginPreview,
  onToggleForceSetupPreview,
  onToggleForceLoginPreview,
  onOpenProfile,
  onOpenAppearance,
  onOpenFamily,
  onOpenAddFamily,
  radius,
}) {
  const cardRadius = radius?.xl ?? 12;
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
              <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>{currentUser.displayName || 'User'}</Text>
              <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>{currentUser.email}</Text>
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
              <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>Appearance</Text>
              <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>Theme & dark mode</Text>
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

      <View style={s.familyHubHeader}>
        <Text style={[s.profileHeaderMonthLabel, { color: colors.textPrimary }]}>My Families</Text>
      </View>

      <Card onPress={onOpenFamily} style={{ borderRadius: cardRadius }}>
        <View style={s.appearanceEntryRow}>
          <View style={s.appearanceEntryLeft}>
            <View style={s.appearanceEntryIcon}>
              <FamilyIcon size={24} color={colors.textPrimary} />
            </View>
            <View>
              <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>{String(familyInfo?.name || '').trim() || 'Family'}</Text>
              <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>
                {`${members.length} ${members.length === 1 ? 'person' : 'people'} with access`}
              </Text>
            </View>
          </View>
          <View style={s.appearanceEntryRight}>
            <View style={s.familyAvatarStack}>
              {members.slice(0, 4).map((member, index) => (
                <View
                  key={`fam-preview-${member.uid}`}
                  style={[
                    s.familyAvatarBubble,
                    index === 0 && s.familyAvatarBubbleFirst,
                    { backgroundColor: colors.inputBg, borderColor: colors.cardBg },
                  ]}
                >
                  <Text style={[s.familyAvatarBubbleText, { color: colors.textPrimary }]}>
                    {(member.displayName || member.email || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
            <ChevronRightIcon size={20} color={colors.textTertiary} />
          </View>
        </View>
      </Card>

      <Card style={[s.cardGap, { borderRadius: cardRadius }]} onPress={onOpenAddFamily}>
        <View style={s.appearanceEntryRow}>
          <View style={s.appearanceEntryLeft}>
            <View style={[s.addChildIconWrap, { backgroundColor: colors.inputBg }]}>
              <PlusIcon size={20} color={colors.textPrimary} />
            </View>
            <View>
              <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>Add Family</Text>
              <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>Create another family</Text>
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
