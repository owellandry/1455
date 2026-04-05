import { atom } from "jotai";

// separate file from profile-dropdown.tsx to satisfy fast refresh
export const aProfileDropdownOpen = atom(__STORYBOOK__);
