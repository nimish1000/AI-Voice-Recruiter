"use client";

import { useUser, useClerk } from "@clerk/nextjs";

export function useAuthAction() {
  const { isLoaded, isSignedIn } = useUser();
  const { openSignUp } = useClerk();

  /**
   * Wraps an action with an authentication check.
   * If the user is signed in, the action is executed.
   * If not, the Clerk sign-up modal is opened.
   */
  const performAction = (action: () => void) => {
    if (!isLoaded) return;

    if (isSignedIn) {
      action();
    } else {
      openSignUp({
        forceRedirectUrl: "/dashboard",
      });
    }
  };

  return { performAction, isLoaded, isSignedIn };
}
