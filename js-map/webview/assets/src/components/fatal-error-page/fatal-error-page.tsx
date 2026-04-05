import type { CodexAppServerFatalError } from "protocol";
import { FormattedMessage } from "react-intl";

import { Button } from "@/components/button";
import { CODEX_IDE_URL } from "@/constants/links";
import { useOsInfo } from "@/hooks/use-os-info";
import { messageBus } from "@/message-bus";

/**
 * Displayed when the Codex app server crashes with a fatal error. This should remain a static,
 * minimal page to help the user diagnose the issue and reload the extension, so they can recover,
 * diagnose the issue, or report it.
 */
export function FatalErrorPage({
  fatalError,
  onReset,
}: {
  fatalError: CodexAppServerFatalError;
  onReset: () => void;
}): React.ReactElement {
  const { data: osInfo } = useOsInfo();
  const isWindows = osInfo?.platform === "win32";
  const { errorMessage, cliErrorMessage } = fatalError;

  return (
    <div className="flex size-full items-center justify-center p-6">
      <div className="flex w-full max-w-2xl flex-col gap-4">
        <h2 className="text-2xl font-medium">
          <FormattedMessage
            id="loadingPage.errorTitle"
            defaultMessage="An error has occurred"
            description="Title of the error page"
          />
        </h2>
        <p className="text-token-description-foreground">
          <FormattedMessage
            id="loadingPage.errorDescription"
            defaultMessage="Codex crashed with the following error:"
            description="Description of the error page"
          />
        </p>
        <div className="font-mono whitespace-pre-wrap text-token-error-foreground">
          {errorMessage}
        </div>
        {cliErrorMessage && (
          <div className="font-mono whitespace-pre-wrap text-token-error-foreground">
            {cliErrorMessage}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <p className="text-token-description-foreground">
            <FormattedMessage
              id="loadingPage.errorSignal"
              defaultMessage="Some things to try:"
              description="Helpful things to try when the error page is displayed"
            />
          </p>
          <ul className="list-inside list-disc">
            <li>
              <FormattedMessage
                id="errorPage.list.configToml"
                defaultMessage="Check your config.toml for invalid settings"
                description="Helpful things to try when the error page is displayed"
              />
            </li>
            {isWindows ? (
              <li>
                <FormattedMessage
                  id="errorPage.list.runInWsl"
                  defaultMessage="Check your settings to disable running in WSL if you are seeing compatibility issues"
                  description="Helpful things to try when the error page is displayed"
                />
              </li>
            ) : (
              <li>
                <FormattedMessage
                  id="errorPage.list.checkSettings"
                  defaultMessage="Try updating your IDE settings"
                  description="Helpful things to try when the error page is displayed"
                />
              </li>
            )}
            <li>
              <FormattedMessage
                id="errorPage.list.downloadExtension"
                defaultMessage="Try downloading a different version of the extension"
                description="Helpful things to try when the error page is displayed"
              />
            </li>
          </ul>
        </div>
        <p>
          <FormattedMessage
            id="loadingPage.errorDescription.documentation"
            defaultMessage="Click reload to restart the Codex extension, or visit our {documentationLink} for additional help."
            description="Description of the error page"
            values={{
              documentationLink: (
                <button
                  color="ghost"
                  className="cursor-interaction border-0 bg-transparent p-0 text-token-text-link-foreground outline-none hover:underline focus:border-0 focus:!outline-none"
                  onClick={() => {
                    messageBus.dispatchMessage("open-in-browser", {
                      url: CODEX_IDE_URL,
                    });
                  }}
                >
                  <FormattedMessage
                    id="loadingPage.documentationLink"
                    defaultMessage="documentation"
                    description="One word to use as the Codex documentation link"
                  />
                </button>
              ),
            }}
          />
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              messageBus.dispatchMessage("open-config-toml", {});
            }}
            color="outline"
          >
            <FormattedMessage
              id="loadingPage.openConfigToml"
              defaultMessage="Open Config.toml"
              description="Button label to open the Config.toml file"
            />
          </Button>
          <Button onClick={onReset}>
            <FormattedMessage
              id="loadingPage.reload"
              defaultMessage="Reload"
              description="Button label to reload the page"
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
