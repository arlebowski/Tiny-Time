/**
 * Formspree notifications — https://formspree.io dashboard to view submissions / adjust email recipients.
 */
const FORMSPREE_NEW_SIGNUP_URL = 'https://formspree.io/f/maqvdbyd';
const FORMSPREE_COMMUNITY_URL = 'https://formspree.io/f/xjgleovr';

async function postForm(url, body) {
  if (!url || url.includes('REPLACE_')) return;
  await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/**
 * New Firebase Auth user (first Firestore profile write).
 */
export async function pingNewSignup(user) {
  if (!user) return;
  try {
    await postForm(FORMSPREE_NEW_SIGNUP_URL, {
      email: user.email || '[hidden]',
      provider: user.providerData?.[0]?.providerId || 'unknown',
      uid: user.uid,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // silent
  }
}

/**
 * User opted into community interest from onboarding.
 */
export async function pingCommunityInterest({ babyName, contactEmail, uid }) {
  try {
    await postForm(FORMSPREE_COMMUNITY_URL, {
      babyName: babyName || '',
      contactEmail: contactEmail || '',
      uid: uid || '',
      submittedAt: new Date().toISOString(),
    });
  } catch {
    // silent
  }
}
