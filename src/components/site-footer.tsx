import { brand, footerLinks } from "@/lib/site-content";
import { NewsletterForm } from "./newsletter-form";

export function SiteFooter() {
  return (
    <footer className="bg-background hairline-t">
      <div className="container-content section grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="stack gap-6">
          <p className="text-label">Newsletter</p>
          <h2 className="max-w-md">Receive news of collections and private events.</h2>
          <NewsletterForm />
          <p className="text-xs text-muted">
            By subscribing you agree to receive marketing emails. You can
            unsubscribe at any time.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {footerLinks.map((group) => (
            <div key={group.title} className="stack gap-4">
              <p className="text-label">{group.title}</p>
              <ul className="stack gap-3">
                {group.links.map((label) => (
                  <li key={label}>
                    <a href="#" className="text-sm text-muted transition-colors hover:text-foreground">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="hairline-t">
        <div className="container-content flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
          <p className="font-serif text-lg tracking-[0.2em] uppercase">{brand.name}</p>
          <p className="text-xs text-muted">
            © {brand.name}. Sample storefront.
          </p>
        </div>
      </div>
    </footer>
  );
}
