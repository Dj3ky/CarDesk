/**
 * Classes for DialogContent that make the dialog full-screen on phones and a
 * normal centred dialog from the `sm` breakpoint up. Children are laid out as a
 * flex column so a scrollable list can take the remaining height.
 */
export const MOBILE_FULLSCREEN_DIALOG =
  "flex flex-col top-0 left-0 translate-x-0 translate-y-0 h-[100dvh] max-w-none rounded-none border-0 p-4 " +
  "sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:h-auto sm:max-h-[85vh] sm:rounded-lg sm:border sm:p-6";
