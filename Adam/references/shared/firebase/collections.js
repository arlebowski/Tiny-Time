/**
 * Firestore collection path builders — shared between web and native.
 * These are pure string helpers with no SDK dependency.
 */

export const paths = {
  user: (uid) => `users/${uid}`,
  family: (familyId) => `families/${familyId}`,
  kid: (familyId, kidId) => `families/${familyId}/kids/${kidId}`,
  feedings: (familyId, kidId) => `families/${familyId}/kids/${kidId}/feedings`,
  nursingSessions: (familyId, kidId) => `families/${familyId}/kids/${kidId}/nursingSessions`,
  sleepSessions: (familyId, kidId) => `families/${familyId}/kids/${kidId}/sleepSessions`,
  diaperChanges: (familyId, kidId) => `families/${familyId}/kids/${kidId}/diaperChanges`,
  solidsSessions: (familyId, kidId) => `families/${familyId}/kids/${kidId}/solidsSessions`,
  kidSettings: (familyId, kidId) => `families/${familyId}/kids/${kidId}/settings/default`,
  invite: (code) => `invites/${code}`,
};

/** Sub-collection names under a kid document */
export const COLLECTIONS = {
  feedings: 'feedings',
  nursingSessions: 'nursingSessions',
  sleepSessions: 'sleepSessions',
  diaperChanges: 'diaperChanges',
  solidsSessions: 'solidsSessions',
  settings: 'settings',
};
