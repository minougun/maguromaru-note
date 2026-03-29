import { BrandMark } from "@/components/ui/BrandMark";

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="header-row">
        <BrandMark className="logo-mark" />
        <div>
          <h1 className="header-title">まぐろ丸ノート</h1>
          <p className="header-subtitle">海鮮丼まぐろ丸 ── 本町</p>
        </div>
      </div>
      <div className="accent-line" aria-hidden="true" />
    </header>
  );
}
