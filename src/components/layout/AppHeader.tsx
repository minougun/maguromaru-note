import { AppHeaderAccountLink } from "@/components/layout/AppHeaderAccountLink";
import { BrandMark } from "@/components/ui/BrandMark";
import { APP_INFO } from "@/lib/domain/constants";

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="header-row header-row--split">
        <div className="header-brand">
          <BrandMark className="logo-mark" />
          <div>
            <h1 className="header-title">{APP_INFO.appName}</h1>
            <p className="header-subtitle">{APP_INFO.subtitle}</p>
          </div>
        </div>
        <AppHeaderAccountLink />
      </div>
      <div className="accent-line" aria-hidden="true" />
    </header>
  );
}
