import type { AuthContextValue } from "@/auth/auth-context";
import { AccountPlanType } from "@/utils/skus";

type UpgradeCtaAccount = {
  structure?: string | null;
};

function isPersonalAccount(
  account: UpgradeCtaAccount | null | undefined,
): boolean {
  return account?.structure?.toLowerCase() === "personal";
}

export function isEnterpriseAffiliatedPersonalWorkspace({
  currentAccount,
  accounts,
}: {
  currentAccount: UpgradeCtaAccount | undefined;
  accounts: Array<UpgradeCtaAccount> | undefined;
}): boolean {
  if (!isPersonalAccount(currentAccount)) {
    return false;
  }
  if (accounts == null) {
    // Conservatively assume ent-linked acct until this data is loaded
    return true;
  }
  return accounts.some((account) => !isPersonalAccount(account));
}

export function shouldShowUpgradeCta({
  authMethod,
  plan,
  currentAccount,
  accounts,
}: {
  authMethod: AuthContextValue["authMethod"];
  plan: string | null | undefined;
  currentAccount: UpgradeCtaAccount | undefined;
  accounts: Array<UpgradeCtaAccount> | undefined;
}): boolean {
  if (authMethod !== "chatgpt") {
    return false;
  }
  if (plan !== AccountPlanType.FREE && plan !== AccountPlanType.GO) {
    return false;
  }
  if (currentAccount == null || accounts == null) {
    return false;
  }
  return !isEnterpriseAffiliatedPersonalWorkspace({
    currentAccount,
    accounts,
  });
}
