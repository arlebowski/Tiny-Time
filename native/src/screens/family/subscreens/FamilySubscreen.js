import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import TTInputRow from '../../../components/shared/TTInputRow';
import ChevronRightIcon from '../../../components/icons/ChevronRightIcon';
import { ChevronLeftIcon, EditIcon, PlusIcon, TrashIcon } from '../../../components/icons';

export default function FamilySubscreen({
  s,
  Card,
  colors,
  activeTheme,
  kids,
  kidId,
  members,
  familyInfo,
  familyNameDraft,
  familyOwnerUid,
  currentUser,
  isFamilyOwner,
  savingFamilyName,
  onBack,
  onFamilyNameChange,
  onSaveFamilyName,
  onOpenKid,
  onOpenAddChild,
  onRemoveMember,
  onInvitePartner,
  formatAgeFromDate,
  formatMonthDay,
}) {
  return (
    <>
      <View style={[s.profileHeader, { borderBottomColor: colors.cardBorder || 'transparent' }]}>
        <View style={s.profileHeaderCol}>
          <Pressable onPress={onBack} hitSlop={8} style={s.profileBackButton}>
            <ChevronLeftIcon size={20} color={colors.textSecondary} />
            <Text style={[s.profileBackText, { color: colors.textSecondary }]}>Back</Text>
          </Pressable>
        </View>
        <View style={[s.profileHeaderCol, s.profileHeaderCenter, s.familyHeaderTitleSlot]}>
          <Text style={[s.profileHeaderMonthLabel, { color: colors.textPrimary }]}>Family</Text>
        </View>
        <View style={[s.profileHeaderCol, s.profileHeaderRight]} />
      </View>

      <View style={s.familyNameBlock}>
        {isFamilyOwner ? (
          <TTInputRow
            label="Family Name"
            type="text"
            icon={EditIcon}
            value={familyNameDraft}
            placeholder="Family"
            onChange={onFamilyNameChange}
          />
        ) : (
          <View style={[s.familyNameReadOnlyCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder || colors.borderSubtle }]}>
            <Text style={[s.familyNameReadOnlyLabel, { color: colors.textSecondary }]}>Family Name</Text>
            <Text style={[s.familyNameReadOnlyValue, { color: colors.textPrimary }]}>{familyInfo?.name || 'Family'}</Text>
          </View>
        )}
      </View>

      {isFamilyOwner && String(familyNameDraft || '').trim() && String(familyNameDraft || '').trim() !== String(familyInfo?.name || '').trim() ? (
        <Pressable
          onPress={onSaveFamilyName}
          disabled={savingFamilyName}
          style={({ pressed }) => [
            s.profileSaveButton,
            { backgroundColor: colors.primaryActionBg, opacity: savingFamilyName ? 0.6 : 1 },
            pressed && !savingFamilyName && { opacity: 0.8 },
          ]}
        >
          <Text style={[s.accountBtnText, { color: colors.primaryActionText }]}>{savingFamilyName ? 'Saving...' : 'Save Family Name'}</Text>
        </Pressable>
      ) : null}

      <View style={s.familyHubHeader}>
        <Text style={[s.profileHeaderMonthLabel, { color: colors.textPrimary }]}>Your Kids</Text>
      </View>

      {Array.isArray(kids) && kids.length > 0 && (
        <View style={s.hubKidCards}>
          {kids.map((k) => {
            const isCurrent = k.id === kidId;
            const ageLabel = formatAgeFromDate(k.birthDate);
            const weightVal = Number(k?.babyWeight || k?.currentWeight || k?.weight || 0);
            const weightLabel = Number.isFinite(weightVal) && weightVal > 0 ? `${Math.round(weightVal * 10) / 10} lbs` : null;
            const birthLabel = formatMonthDay(k.birthDate);
            const subtitle = [ageLabel, weightLabel, birthLabel].filter(Boolean).join(' • ');
            return (
              <Card key={`family-kid-${k.id}`} onPress={() => onOpenKid(k)}>
                <View style={s.hubKidRow}>
                  <View style={s.hubKidLeft}>
                    <View style={[s.hubKidAvatarRing, { borderColor: activeTheme?.bottle?.primary || colors.primaryBrand }]}>
                      {k.photoURL ? (
                        <Image source={{ uri: k.photoURL }} style={s.hubKidAvatarImage} />
                      ) : (
                        <View style={[s.hubKidAvatarFallback, { backgroundColor: activeTheme?.bottle?.soft || colors.subtleSurface }]}>
                          <Text style={s.hubKidAvatarEmoji}>👶</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.hubKidTextWrap}>
                      <Text style={[s.hubKidTitle, { color: colors.textPrimary }]} numberOfLines={1}>{k.name || 'Baby'}</Text>
                      <Text style={[s.hubKidSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle || 'Tap to open profile'}</Text>
                    </View>
                  </View>
                  <View style={s.hubKidRight}>
                    {isCurrent ? (
                      <View style={s.hubKidActiveBadge}>
                        <Text style={s.hubKidActiveBadgeText}>Active</Text>
                      </View>
                    ) : null}
                    <ChevronRightIcon size={20} color={colors.textTertiary} />
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <Card style={s.cardGap} onPress={onOpenAddChild}>
        <View style={s.appearanceEntryRow}>
          <View style={s.appearanceEntryLeft}>
            <View style={[s.addChildIconWrap, { backgroundColor: colors.inputBg }]}>
              <PlusIcon size={20} color={colors.textPrimary} />
            </View>
            <View>
              <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>Add Child</Text>
              <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>Track another little one</Text>
            </View>
          </View>
          <View style={s.appearanceEntryRight}>
            <ChevronRightIcon size={20} color={colors.textTertiary} />
          </View>
        </View>
      </Card>

      <View style={s.familyHubHeader}>
        <Text style={[s.profileHeaderMonthLabel, { color: colors.textPrimary }]}>Family Members</Text>
      </View>

      <View style={s.membersCardsList}>
        {members.map((member) => {
          const memberUid = member?.uid || null;
          const isOwner = Boolean(memberUid && familyOwnerUid && memberUid === familyOwnerUid);
          return (
            <Card key={member.uid}>
              <View style={s.memberCardRow}>
                <View style={s.memberAvatarWrap}>
                  {member.photoURL ? (
                    <Image source={{ uri: member.photoURL }} style={s.memberAvatar} />
                  ) : (
                    <View style={[s.memberAvatarFallback, { backgroundColor: colors.subtleSurface }]}>
                      <Text style={[s.memberInitial, { color: colors.textPrimary }]}>{(member.displayName || member.email || '?').charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                </View>
                <View style={s.memberInfo}>
                  <View style={s.memberNameRow}>
                    <Text style={[s.memberName, { color: colors.textPrimary }]} numberOfLines={1}>{member.displayName || member.email || 'Member'}</Text>
                    {isOwner ? (
                      <View style={[s.ownerBadge, { backgroundColor: colors.segTrack || colors.track, borderColor: colors.cardBorder || colors.borderSubtle }]}>
                        <Text style={[s.ownerBadgeText, { color: colors.textSecondary }]}>Owner</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[s.memberEmail, { color: colors.textSecondary }]} numberOfLines={1}>{member.email}</Text>
                </View>
                {member.uid !== currentUser.uid && (
                  <Pressable
                    onPress={() => onRemoveMember(member.uid)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${member.displayName || member.email || 'member'}`}
                    style={({ pressed }) => [
                      s.memberRemoveIconButton,
                      { backgroundColor: colors.segTrack || colors.track, borderColor: colors.cardBorder },
                      pressed && s.memberRemoveIconButtonPressed,
                    ]}
                  >
                    <TrashIcon size={20} color={colors.error} />
                  </Pressable>
                )}
              </View>
            </Card>
          );
        })}
      </View>

      <Card style={s.cardGap}>
        <View style={s.familyInviteCard}>
          <Text style={[s.familyInviteText, { color: colors.textSecondary }]}>Share a link to invite someone. They'll need a Tiny account if they don't have one yet.</Text>
          <Pressable onPress={onInvitePartner} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text style={[s.familyInviteLink, { color: activeTheme?.bottle?.primary || colors.primaryBrand }]}>Copy invite link ↗</Text>
          </Pressable>
        </View>
      </Card>

      <View style={{ height: 40 }} />
    </>
  );
}
