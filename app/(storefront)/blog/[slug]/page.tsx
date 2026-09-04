/**
 * A published article, at its own URL.
 *
 * `/blog` linked to `/blog/${slug}` for six hard-coded demo posts and this
 * route did not exist, so every card on the public blog was a 404. It is a
 * server component on purpose: a blog earns its keep in search results, and
 * `generateMetadata` cannot run in a client one. The article is fetched twice
 * in the source and once over the wire — `getPublishedArticle` is memoized for
 * the request.
 */
import { cache } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft } from "lucide-react"
import DOMPurify from "isomorphic-dompurify"
import { fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { resolveStorefrontStore } from "@/lib/convex-server"
import { formatArticleDate } from "@/lib/blog/presentation"
import { ARTICLE_SANITIZE_PROFILE } from "@/lib/blog/sanitize-profile"
import { Badge } from "@/components/ui/badge"

interface Props {
  params: Promise<{ slug: string }>
}

/**
 * The article at this slug, wherever in the brand it was published.
 *
 * The visitor's own establishment is asked first, because that is whose blog
 * they are reading. Failing that, the deployment's other published
 * establishments are — one owner runs one to many locations off one backend,
 * an article is written for the brand rather than for a branch, and the
 * alternative is a 404 on a link the site itself rendered. The visitor's store
 * is resolved from a cookie the browser may not have sent yet, so without this
 * the first arrival on a shared link is exactly that 404.
 *
 * Memoized for the request: `generateMetadata` and the page body both need it.
 */
const getPublishedArticle = cache(async (slug: string) => {
  try {
    const store = await resolveStorefrontStore()

    if (store) {
      const article = await fetchQuery(api.blog.getArticleBySlug, {
        storeId: store._id as Id<"stores">,
        slug,
      })
      if (article) return article
    }

    const stores = await fetchQuery(api.stores.list, {})
    for (const candidate of stores ?? []) {
      if (candidate._id === store?._id) continue
      const article = await fetchQuery(api.blog.getArticleBySlug, {
        storeId: candidate._id as Id<"stores">,
        slug,
      })
      if (article) return article
    }

    return null
  } catch {
    // A Convex outage, or a deployment with no `NEXT_PUBLIC_CONVEX_URL`. The
    // resolution above throws in both cases and used to do so outside this
    // block, which turned an outage into an unhandled 500 rather than a 404.
    return null
  }
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await getPublishedArticle(slug)

  if (!article) return { title: "Article introuvable" }

  const title = article.content.metaTitle || article.content.title
  const description = article.content.metaDescription || article.content.excerpt
  const image = article.ogImage?.url ?? article.coverImage?.url

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: article.publishedAt
        ? new Date(article.publishedAt).toISOString()
        : undefined,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params
  const article = await getPublishedArticle(slug)

  if (!article) notFound()

  // The editor stores Tiptap's HTML and the AI path stores a model's. Neither
  // is trustworthy markup, and this is the only place a visitor's browser is
  // asked to execute it — so it is sanitised here, at the render, every time.
  const content = DOMPurify.sanitize(
    article.content.content ?? "",
    ARTICLE_SANITIZE_PROFILE,
  )

  return (
    <div className="min-h-screen bg-[#FDFCF6] dark:bg-zinc-950 text-[#1A1A1A] dark:text-zinc-100 font-sans">
      <article className="mx-auto max-w-3xl px-6 md:px-12 py-16 md:py-24">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-[#0D5C3F] dark:hover:text-emerald-400 transition-colors mb-10"
        >
          <ArrowLeft className="h-3 w-3" /> Tous les articles
        </Link>

        {article.category && (
          <Badge className="w-fit mb-4 px-3 py-1 rounded-full font-black tracking-widest uppercase text-[9px] bg-[#0D5C3F]/10 dark:bg-emerald-950/30 text-[#0D5C3F] dark:text-emerald-400 border-none">
            {article.category.name}
          </Badge>
        )}

        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.95] mb-6">
          {article.content.title}
        </h1>

        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-8">
          {[formatArticleDate(article.publishedAt), `${article.readingMinutes} min de lecture`]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {article.content.excerpt && (
          <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mb-10">
            {article.content.excerpt}
          </p>
        )}

        {article.coverImage?.url && (
          <div className="relative aspect-[16/9] rounded-[2rem] overflow-hidden mb-12 border border-zinc-100 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
            <Image
              src={article.coverImage.url}
              alt={article.coverImage.alt ?? article.content.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>
        )}

        <div
          className="prose prose-lg dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-zinc-100 dark:border-zinc-800">
            {article.tags.map((tag) => (
              <Badge
                key={tag._id}
                variant="secondary"
                className="text-[9px] font-black uppercase tracking-widest rounded-full px-3 py-1"
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </article>
    </div>
  )
}
