import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/layout";
import { CONTACT, SITE_URL } from "@/constants";
import { COVER_HEIGHT, COVER_WIDTH, coverSourceName, coverWorkTitle, getAllPosts } from "@/lib/blog";
import { buildSocialMeta } from "@/lib/social-meta";

const PATH = "/snimki-i-litsenzi";
const TITLE = "Снимки и лицензи | SelectAuto";
const DESCRIPTION = "Авторите, лицензите и източниците на снимките в блога на SelectAuto.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}${PATH}` },
  ...buildSocialMeta({ title: TITLE, description: DESCRIPTION, path: PATH }),
};

/**
 * /snimki-i-litsenzi — the credits for the photos the site shows from elsewhere (decision 44): every blog cover with
 * its post, its own title, source, author and license, and how it was changed. One page instead of a caption under
 * each photo, so the posts stay clean; every page links here from the footer's legal row (data/navigation.ts).
 * Creative Commons licenses accept credit „in any reasonable manner", including a link to a place with the
 * information (creativecommons.org/faq), and CC BY-SA 3.0 also asks for the work's title, hence the file name.
 *
 * Built from the posts' `cover` frontmatter (lib/blog.ts), so a new post's photo is listed by itself; the covers' test
 * keeps every source on Wikimedia Commons, which the lead names. Static. Classes in styles/info-credits.css under the
 * page's root class `.in-credits-pg`. No board yet (REDESIGN.md).
 */
export default function CreditsPage() {
  const posts = getAllPosts().filter((p) => p.cover);
  return (
    <>
      <SiteHeader />
      <main className="in-credits-pg flex-1 pt-(--header-h)">
        <section className="in-head">
          <div className="sa-wrap">
            <div className="in-box in-head__in">
              <h1 className="type-h1">Снимки и лицензи</h1>
              <p className="sa-lead">
                Снимките в блога са от Wikimedia Commons и се използват според лиценза на всяка. Тук са авторът,
                лицензът и източникът на всяка от тях.
              </p>
            </div>
          </div>
        </section>

        <section className="sa-band">
          <div className="sa-wrap">
            <div className="in-box">
              <h2 className="in-cred-h type-h3">Снимки в блога</h2>
              <ul className="in-cred">
                {posts.map((p, i) => {
                  const cover = p.cover!;
                  return (
                    <li key={p.slug} id={p.slug} className="in-cred__i">
                      <div className="in-cred__ph">
                        <Image
                          src={cover.src}
                          overrideSrc={cover.src}
                          alt={cover.alt}
                          width={COVER_WIDTH}
                          height={COVER_HEIGHT}
                          sizes="(min-width: 640px) 192px, 100vw"
                          loading={i < 2 ? "eager" : "lazy"}
                        />
                      </div>
                      <div className="in-cred__b">
                        <h3>
                          <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                        </h3>
                        <p className="in-cred__t">
                          „
                          <a href={cover.source} target="_blank" rel="noopener noreferrer">
                            {coverWorkTitle(cover)}
                          </a>
                          “, {coverSourceName(cover)}
                        </p>
                        <p className="in-cred__m">
                          <span>Автор: {cover.author}</span>
                          <span>
                            Лиценз:{" "}
                            <a href={cover.licenseUrl} target="_blank" rel="noopener noreferrer">
                              {cover.license}
                            </a>
                          </span>
                          <span>Изрязана от оригинала</span>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="in-cred__note">
                Изрязаните версии на снимките под CC BY-SA се публикуват при същия лиценз. Ако сте автор на някоя от
                снимките и забележите неточност, пишете ни на <a href={CONTACT.emailHref}>{CONTACT.email}</a>.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
