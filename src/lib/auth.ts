import {
  sendSignInLinkToEmail,
  signInWithEmailLink,
  isSignInWithEmailLink,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { getSyncEmail, setSyncEmail } from './sync-settings';

const ACTION_CODE_SETTINGS = {
  url: 'https://YOUR_PROJECT.web.app/auth-callback',
  handleCodeInApp: true,
};

export async function sendMagicLink(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS);
  await setSyncEmail(email);
}

export async function completeMagicLink(link: string): Promise<User> {
  const auth = getFirebaseAuth();
  if (!isSignInWithEmailLink(auth, link)) {
    throw new Error('Invalid sign-in link');
  }
  const email = await getSyncEmail();
  if (!email) {
    throw new Error('No email stored. Please enter your email again.');
  }
  const result = await signInWithEmailLink(auth, email, link);
  return result.user;
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export function checkForSignInLink(): string | null {
  try {
    const auth = getFirebaseAuth();
    const url = window.location.href;
    if (isSignInWithEmailLink(auth, url)) {
      return url;
    }
  } catch {
    // Not in browser context or no valid link
  }
  return null;
}
