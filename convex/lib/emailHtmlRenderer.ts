/**
 * Email HTML Renderer (inlined from @be-in-digital/marketing)
 *
 * Converts block-based email templates to email-safe HTML.
 * Uses HTML tables and inline styles — no flexbox, no grid, no modern CSS.
 * Compatible with Outlook, Gmail, Apple Mail.
 */

// ─── XSS protection utilities ─────────────────────────────────────────────────

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch)
}

export function sanitizeUrl(url: string): string {
  const trimmed = url.trim()
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("mailto:")
  ) {
    return escapeHtml(trimmed)
  }
  return ""
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailBranding {
  logoUrl?: string
  primaryColor: string
  secondaryColor: string
  footerText?: string
  socialLinks?: {
    facebook?: string
    instagram?: string
    website?: string
  }
  senderName: string
  unsubscribeUrl: string
  unsubscribeText: string
}

export type BlockAlignment = "left" | "center" | "right"

export interface TextBlock {
  type: "text"
  id: string
  content: string
  alignment?: BlockAlignment
}

export interface ImageBlock {
  type: "image"
  id: string
  url: string
  alt?: string
  linkUrl?: string
  alignment?: BlockAlignment
  width?: number
}

export interface ButtonBlock {
  type: "button"
  id: string
  text: string
  url: string
  backgroundColor?: string
  textColor?: string
  alignment?: BlockAlignment
}

export interface ProductBlock {
  type: "product"
  id: string
  productIds: string[]
  layout?: "list" | "grid"
}

export interface DividerBlock {
  type: "divider"
  id: string
  color?: string
  thickness?: number
}

export interface SpacerBlock {
  type: "spacer"
  id: string
  height?: number
}

export interface HeadingBlock {
  type: "heading"
  id: string
  content: string
  level: "h1" | "h2" | "h3"
  alignment?: BlockAlignment
  color?: string
}

export interface SocialBlock {
  type: "social"
  id: string
  alignment?: BlockAlignment
  links: { platform: string; url: string }[]
  style?: "icons" | "text"
}

export interface CouponBlock {
  type: "coupon"
  id: string
  code: string
  description?: string
  backgroundColor?: string
  textColor?: string
  borderColor?: string
}

export type ColumnChildBlock =
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | HeadingBlock
  | DividerBlock
  | SpacerBlock

export interface ColumnsBlock {
  type: "columns"
  id: string
  columns: { blocks: ColumnChildBlock[] }[]
  layout: "2" | "3"
}

export interface VideoBlock {
  type: "video"
  id: string
  thumbnailUrl: string
  videoUrl: string
  alt?: string
  alignment?: BlockAlignment
}

export interface HeroBlock {
  type: "hero"
  id: string
  imageUrl: string
  title: string
  subtitle?: string
  buttonText?: string
  buttonUrl?: string
  overlayColor?: string
  textColor?: string
  alignment?: BlockAlignment
}

export interface MenuHighlightBlock {
  type: "menu_highlight"
  id: string
  title?: string
  items: { name: string; description?: string; price: string; imageUrl?: string }[]
  layout?: "list" | "grid"
  accentColor?: string
}

export interface CountdownBlock {
  type: "countdown"
  id: string
  deadlineDate: string
  title?: string
  textColor?: string
  backgroundColor?: string
}

export interface GalleryBlock {
  type: "gallery"
  id: string
  images: { url: string; alt?: string; linkUrl?: string }[]
  columns?: 2 | 3 | 4
  gap?: number
}

export interface LocationBlock {
  type: "location"
  id: string
  address: string
  city?: string
  mapUrl?: string
  phone?: string
  email?: string
  alignment?: BlockAlignment
}

export interface HoursBlock {
  type: "hours"
  id: string
  title?: string
  rows: { day: string; hours: string }[]
  accentColor?: string
}

export interface TestimonialBlock {
  type: "testimonial"
  id: string
  quote: string
  author: string
  rating?: number
  avatarUrl?: string
  backgroundColor?: string
  textColor?: string
}

export interface DecorativeDividerBlock {
  type: "decorative_divider"
  id: string
  style: "dots" | "stars" | "wave" | "diamond"
  color?: string
  alignment?: BlockAlignment
}

export interface ProductData {
  id: string
  name: string
  price: number
  imageUrl?: string
  description?: string
}

export type EmailBlock =
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | ProductBlock
  | DividerBlock
  | SpacerBlock
  | HeadingBlock
  | SocialBlock
  | CouponBlock
  | ColumnsBlock
  | VideoBlock
  | HeroBlock
  | MenuHighlightBlock
  | CountdownBlock
  | GalleryBlock
  | LocationBlock
  | HoursBlock
  | TestimonialBlock
  | DecorativeDividerBlock

// ─── Individual block renderers ───────────────────────────────────────────────

function alignToTableAlign(alignment?: BlockAlignment): string {
  switch (alignment) {
    case "center":
      return "center"
    case "right":
      return "right"
    default:
      return "left"
  }
}

export function renderTextBlock(block: TextBlock): string {
  const align = alignToTableAlign(block.alignment)
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td align="${align}" style="padding:12px 24px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#333333;">
      ${escapeHtml(block.content)}
    </td>
  </tr>
</table>`
}

export function renderImageBlock(block: ImageBlock): string {
  const align = alignToTableAlign(block.alignment)
  const width = block.width ?? 600
  const src = sanitizeUrl(block.url)
  const alt = escapeHtml(block.alt ?? "")
  const img = `<img src="${src}" alt="${alt}" width="${width}" style="display:block;max-width:100%;height:auto;border:0;" />`
  const wrapped = block.linkUrl
    ? `<a href="${sanitizeUrl(block.linkUrl)}" style="display:block;text-decoration:none;">${img}</a>`
    : img

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td align="${align}" style="padding:12px 24px;">
      ${wrapped}
    </td>
  </tr>
</table>`
}

export function renderButtonBlock(block: ButtonBlock): string {
  const align = alignToTableAlign(block.alignment)
  const bg = block.backgroundColor ?? "#000000"
  const color = block.textColor ?? "#ffffff"
  const url = sanitizeUrl(block.url)
  const text = escapeHtml(block.text)

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td align="${align}" style="padding:16px 24px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="10%" stroke="f" fillcolor="${bg}">
        <w:anchorlock/>
        <center>
      <![endif]-->
      <a href="${url}"
         style="background-color:${bg};border-radius:4px;color:${color};display:inline-block;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;line-height:44px;text-align:center;text-decoration:none;width:200px;-webkit-text-size-adjust:none;mso-hide:all;">
        ${text}
      </a>
      <!--[if mso]>
        </center>
      </v:roundrect>
      <![endif]-->
    </td>
  </tr>
</table>`
}

function renderSingleProduct(
  p: ProductData,
  formatPrice: (n: number) => string
): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    ${p.imageUrl ? `<td><img src="${sanitizeUrl(p.imageUrl)}" alt="${escapeHtml(p.name)}" width="100%" style="display:block;border:0;max-width:100%;" /></td></tr><tr>` : ""}
    <td style="padding:8px 0;">
      <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#333333;">${escapeHtml(p.name)}</p>
      <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#333333;">${formatPrice(p.price)}</p>
    </td>
  </tr>
</table>`
}

export function renderProductBlock(
  block: ProductBlock,
  products: ProductData[]
): string {
  if (products.length === 0) return ""

  const formatPrice = (cents: number): string =>
    (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })

  if (block.layout === "grid" && products.length >= 2) {
    const rows: string[] = []
    for (let i = 0; i < products.length; i += 2) {
      const left = products[i]
      const right = products[i + 1]
      rows.push(`
<tr>
  <td width="50%" valign="top" style="padding:8px 12px;border:1px solid #eeeeee;">
    ${left ? renderSingleProduct(left, formatPrice) : ""}
  </td>
  <td width="50%" valign="top" style="padding:8px 12px;border:1px solid #eeeeee;">
    ${right ? renderSingleProduct(right, formatPrice) : ""}
  </td>
</tr>`)
    }
    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;padding:12px 24px;">
  <tr><td style="padding:12px 24px;">
    <table width="100%" cellpadding="0" cellspacing="4" border="0" style="border-collapse:collapse;">
      ${rows.join("")}
    </table>
  </td></tr>
</table>`
  }

  const items = products
    .map(
      (p) => `
<tr>
  <td style="padding:12px;border-bottom:1px solid #eeeeee;vertical-align:top;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        ${p.imageUrl ? `<td width="80" style="vertical-align:top;padding-right:12px;"><img src="${sanitizeUrl(p.imageUrl)}" alt="${escapeHtml(p.name)}" width="80" height="80" style="display:block;border:0;object-fit:cover;" /></td>` : ""}
        <td style="vertical-align:top;">
          <p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#333333;">${escapeHtml(p.name)}</p>
          ${p.description ? `<p style="margin:0 0 8px 0;font-family:Arial,sans-serif;font-size:13px;color:#666666;">${escapeHtml(p.description)}</p>` : ""}
          <p style="margin:0;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#333333;">${formatPrice(p.price)}</p>
        </td>
      </tr>
    </table>
  </td>
</tr>`
    )
    .join("")

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr><td style="padding:0 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      ${items}
    </table>
  </td></tr>
</table>`
}

export function renderDividerBlock(block: DividerBlock): string {
  const color = block.color ?? "#eeeeee"
  const thickness = block.thickness ?? 1

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:8px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="border-top:${thickness}px solid ${color};font-size:0;line-height:0;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

export function renderSpacerBlock(block: SpacerBlock): string {
  const height = block.height ?? 24

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td height="${height}" style="font-size:0;line-height:${height}px;">&nbsp;</td>
  </tr>
</table>`
}

export function renderHeadingBlock(block: HeadingBlock): string {
  const align = alignToTableAlign(block.alignment)
  const color = block.color ?? "#333333"
  const sizes = {
    h1: { fontSize: "28px", lineHeight: "1.3" },
    h2: { fontSize: "22px", lineHeight: "1.3" },
    h3: { fontSize: "18px", lineHeight: "1.4" },
  } as const
  const sizeData = sizes[block.level]
  const fontSize = sizeData.fontSize
  const lineHeight = sizeData.lineHeight

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td align="${align}" style="padding:12px 24px;font-family:Arial,sans-serif;font-size:${fontSize};font-weight:bold;line-height:${lineHeight};color:${color};">
      ${escapeHtml(block.content)}
    </td>
  </tr>
</table>`
}

export function renderSocialBlock(block: SocialBlock): string {
  const align = alignToTableAlign(block.alignment)
  const PLATFORM_COLORS: Record<string, string> = {
    facebook: "#1877F2",
    instagram: "#E4405F",
    tiktok: "#000000",
    twitter: "#1DA1F2",
    youtube: "#FF0000",
    website: "#555555",
  }

  const links = block.links
    .map((link) => {
      const color = PLATFORM_COLORS[link.platform] ?? "#555555"
      const label = escapeHtml(link.platform.charAt(0).toUpperCase() + link.platform.slice(1))
      return `<a href="${sanitizeUrl(link.url)}" style="color:${color};text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;margin:0 8px;">${label}</a>`
    })
    .join(" ")

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td align="${align}" style="padding:16px 24px;">
      ${links}
    </td>
  </tr>
</table>`
}

export function renderCouponBlock(block: CouponBlock): string {
  const bg = block.backgroundColor ?? "#fff8e1"
  const color = block.textColor ?? "#333333"
  const border = block.borderColor ?? "#f9a825"

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:12px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:${bg};border:2px dashed ${border};border-radius:8px;">
        <tr>
          <td align="center" style="padding:20px;font-family:Arial,sans-serif;color:${color};">
            ${block.description ? `<p style="margin:0 0 8px 0;font-size:14px;">${escapeHtml(block.description)}</p>` : ""}
            <p style="margin:0;font-size:24px;font-weight:bold;letter-spacing:3px;font-family:'Courier New',monospace;">${escapeHtml(block.code)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

function renderColumnChildBlock(block: ColumnChildBlock): string {
  switch (block.type) {
    case "text":
      return renderTextBlock(block)
    case "image":
      return renderImageBlock(block)
    case "button":
      return renderButtonBlock(block)
    case "heading":
      return renderHeadingBlock(block)
    case "divider":
      return renderDividerBlock(block)
    case "spacer":
      return renderSpacerBlock(block)
    default:
      return ""
  }
}

export function renderColumnsBlock(block: ColumnsBlock): string {
  const colCount = block.layout === "3" ? 3 : 2
  const width = Math.floor(100 / colCount)

  const tds = block.columns
    .slice(0, colCount)
    .map((col) => {
      const innerHtml = col.blocks
        .map((child) => renderColumnChildBlock(child))
        .join("")
      return `<td width="${width}%" valign="top" style="padding:8px 0;">${innerHtml || "&nbsp;"}</td>`
    })
    .join("")

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:12px 24px;">
      <!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><![endif]-->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>${tds}</tr>
      </table>
      <!--[if mso]></tr></table><![endif]-->
    </td>
  </tr>
</table>`
}

export function renderVideoBlock(block: VideoBlock): string {
  const align = alignToTableAlign(block.alignment)
  const alt = escapeHtml(block.alt ?? "Voir la vidéo")

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td align="${align}" style="padding:12px 24px;">
      <a href="${sanitizeUrl(block.videoUrl)}" style="display:inline-block;text-decoration:none;position:relative;">
        <img src="${sanitizeUrl(block.thumbnailUrl)}" alt="${alt}" width="560" style="display:block;max-width:100%;height:auto;border:0;border-radius:4px;" />
      </a>
    </td>
  </tr>
</table>`
}

export function renderHeroBlock(block: HeroBlock): string {
  const align = alignToTableAlign(block.alignment)
  const color = block.textColor ?? "#ffffff"
  const overlay = block.overlayColor ?? "rgba(0,0,0,0.4)"

  const heroImageUrl = sanitizeUrl(block.imageUrl)
  const buttonHtml =
    block.buttonText && block.buttonUrl
      ? `<a href="${sanitizeUrl(block.buttonUrl)}" style="display:inline-block;background-color:#ffffff;color:#333333;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:4px;margin-top:16px;">${escapeHtml(block.buttonText)}</a>`
      : ""

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td align="${align}" background="${heroImageUrl}" width="600" height="300" valign="middle" style="background-image:url('${heroImageUrl}');background-size:cover;background-position:center;background-color:#333333;height:300px;">
      <!--[if gte mso 9]>
      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:300px;">
        <v:fill type="frame" src="${heroImageUrl}" color="#333333" />
        <v:textbox inset="0,0,0,0">
      <![endif]-->
      <div style="background-color:${overlay};padding:40px 24px;text-align:${align};">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:28px;font-weight:bold;color:${color};line-height:1.3;">${escapeHtml(block.title)}</p>
        ${block.subtitle ? `<p style="margin:8px 0 0 0;font-family:Arial,sans-serif;font-size:16px;color:${color};line-height:1.5;">${escapeHtml(block.subtitle)}</p>` : ""}
        ${buttonHtml}
      </div>
      <!--[if gte mso 9]>
        </v:textbox>
      </v:rect>
      <![endif]-->
    </td>
  </tr>
</table>`
}

function renderSingleMenuItem(
  item: { name: string; description?: string; price: string; imageUrl?: string },
  accent: string
): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  ${item.imageUrl ? `<tr><td><img src="${sanitizeUrl(item.imageUrl)}" alt="${escapeHtml(item.name)}" width="100%" style="display:block;border:0;border-radius:4px;max-width:100%;" /></td></tr>` : ""}
  <tr>
    <td style="padding:8px 0;">
      <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#333333;">${escapeHtml(item.name)}</p>
      ${item.description ? `<p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:12px;color:#666666;">${escapeHtml(item.description)}</p>` : ""}
      <p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:${accent};">${escapeHtml(item.price)}</p>
    </td>
  </tr>
</table>`
}

export function renderMenuHighlightBlock(block: MenuHighlightBlock): string {
  if (block.items.length === 0) return ""

  const accent = block.accentColor ?? "#FF5722"
  const titleHtml = block.title
    ? `<tr><td style="padding:12px 24px 8px;font-family:Arial,sans-serif;font-size:20px;font-weight:bold;color:#333333;">${escapeHtml(block.title)}</td></tr>`
    : ""

  if (block.layout === "grid" && block.items.length >= 2) {
    const rows: string[] = []
    for (let i = 0; i < block.items.length; i += 2) {
      const left = block.items[i]
      const right = block.items[i + 1]
      rows.push(`
<tr>
  <td width="50%" valign="top" style="padding:8px 12px;">
    ${left ? renderSingleMenuItem(left, accent) : ""}
  </td>
  <td width="50%" valign="top" style="padding:8px 12px;">
    ${right ? renderSingleMenuItem(right, accent) : ""}
  </td>
</tr>`)
    }
    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  ${titleHtml}
  <tr><td style="padding:0 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      ${rows.join("")}
    </table>
  </td></tr>
</table>`
  }

  const items = block.items
    .map(
      (item) => `
<tr>
  <td style="padding:8px 0;border-bottom:1px solid #eeeeee;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr>
        ${item.imageUrl ? `<td width="80" style="vertical-align:top;padding-right:12px;"><img src="${sanitizeUrl(item.imageUrl)}" alt="${escapeHtml(item.name)}" width="80" height="80" style="display:block;border:0;border-radius:4px;object-fit:cover;" /></td>` : ""}
        <td style="vertical-align:top;">
          <p style="margin:0;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#333333;">${escapeHtml(item.name)}</p>
          ${item.description ? `<p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:13px;color:#666666;">${escapeHtml(item.description)}</p>` : ""}
          <p style="margin:6px 0 0 0;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:${accent};">${escapeHtml(item.price)}</p>
        </td>
      </tr>
    </table>
  </td>
</tr>`
    )
    .join("")

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  ${titleHtml}
  <tr><td style="padding:0 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      ${items}
    </table>
  </td></tr>
</table>`
}

export function renderCountdownBlock(block: CountdownBlock): string {
  const bg = block.backgroundColor ?? "#1a1a1a"
  const color = block.textColor ?? "#ffffff"
  const title = block.title ?? "Offre limitée"

  let formattedDate = block.deadlineDate
  try {
    const date = new Date(block.deadlineDate + "T23:59:59")
    formattedDate = date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    // Keep raw string if parsing fails
  }

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:12px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:${bg};border-radius:8px;">
        <tr>
          <td align="center" style="padding:24px;font-family:Arial,sans-serif;color:${color};">
            <p style="margin:0 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:2px;">${escapeHtml(title)}</p>
            <p style="margin:0;font-size:22px;font-weight:bold;">Valable jusqu'au ${escapeHtml(formattedDate)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

export function renderGalleryBlock(block: GalleryBlock): string {
  if (block.images.length === 0) return ""
  const cols = block.columns ?? 2
  const gap = block.gap ?? 8
  const width = Math.floor(100 / cols)

  const rows: string[] = []
  for (let i = 0; i < block.images.length; i += cols) {
    const cells = block.images.slice(i, i + cols).map((img) => {
      const imgTag = `<img src="${sanitizeUrl(img.url)}" alt="${escapeHtml(img.alt ?? "")}" width="100%" style="display:block;border:0;border-radius:4px;max-width:100%;" />`
      const wrapped = img.linkUrl
        ? `<a href="${sanitizeUrl(img.linkUrl)}" style="display:block;text-decoration:none;">${imgTag}</a>`
        : imgTag
      return `<td width="${width}%" valign="top" style="padding:${gap / 2}px;">${wrapped}</td>`
    }).join("")
    rows.push(`<tr>${cells}</tr>`)
  }

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:12px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        ${rows.join("")}
      </table>
    </td>
  </tr>
</table>`
}

export function renderLocationBlock(block: LocationBlock): string {
  const align = alignToTableAlign(block.alignment)
  const mapLink = block.mapUrl
    ? `<a href="${sanitizeUrl(block.mapUrl)}" style="color:#1a73e8;text-decoration:underline;font-family:Arial,sans-serif;font-size:13px;">Voir sur la carte</a>`
    : ""

  const details: string[] = []
  if (block.phone) details.push(`<p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:14px;color:#555555;">&#9742; ${escapeHtml(block.phone)}</p>`)
  if (block.email) details.push(`<p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:14px;color:#555555;">&#9993; ${escapeHtml(block.email)}</p>`)

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td align="${align}" style="padding:16px 24px;">
      <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          <td style="font-family:Arial,sans-serif;">
            <p style="margin:0;font-size:16px;font-weight:bold;color:#333333;">${escapeHtml(block.address)}</p>
            ${block.city ? `<p style="margin:4px 0 0 0;font-size:14px;color:#555555;">${escapeHtml(block.city)}</p>` : ""}
            ${details.join("")}
            ${mapLink ? `<p style="margin:8px 0 0 0;">${mapLink}</p>` : ""}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

export function renderHoursBlock(block: HoursBlock): string {
  if (block.rows.length === 0) return ""
  const accent = block.accentColor ?? "#333333"
  const titleHtml = block.title
    ? `<tr><td colspan="2" style="padding:0 0 8px 0;font-family:Arial,sans-serif;font-size:18px;font-weight:bold;color:${accent};">${escapeHtml(block.title)}</td></tr>`
    : ""

  const rowsHtml = block.rows
    .map(
      (row) => `
<tr>
  <td style="padding:4px 12px 4px 0;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;color:#333333;border-bottom:1px solid #eeeeee;">${escapeHtml(row.day)}</td>
  <td style="padding:4px 0;font-family:Arial,sans-serif;font-size:14px;color:#555555;border-bottom:1px solid #eeeeee;text-align:right;">${escapeHtml(row.hours)}</td>
</tr>`
    )
    .join("")

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:12px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        ${titleHtml}
        ${rowsHtml}
      </table>
    </td>
  </tr>
</table>`
}

export function renderTestimonialBlock(block: TestimonialBlock): string {
  const bg = block.backgroundColor ?? "#f9f9f9"
  const color = block.textColor ?? "#333333"
  const stars = block.rating
    ? `<p style="margin:0 0 8px 0;font-size:18px;color:#f9a825;">${"&#9733;".repeat(block.rating)}${"&#9734;".repeat(5 - block.rating)}</p>`
    : ""

  const avatar = block.avatarUrl
    ? `<td width="48" style="vertical-align:top;padding-right:12px;"><img src="${sanitizeUrl(block.avatarUrl)}" alt="${escapeHtml(block.author)}" width="48" height="48" style="display:block;border:0;border-radius:50%;" /></td>`
    : ""

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:12px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:${bg};border-radius:8px;border-left:4px solid #f9a825;">
        <tr>
          <td style="padding:20px;font-family:Arial,sans-serif;color:${color};">
            ${stars}
            <p style="margin:0 0 12px 0;font-size:15px;font-style:italic;line-height:1.6;">&ldquo;${escapeHtml(block.quote)}&rdquo;</p>
            <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                ${avatar}
                <td style="vertical-align:middle;">
                  <p style="margin:0;font-size:14px;font-weight:bold;color:${color};">${escapeHtml(block.author)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
}

export function renderDecorativeDividerBlock(block: DecorativeDividerBlock): string {
  const align = alignToTableAlign(block.alignment)
  const color = block.color ?? "#cccccc"

  const PATTERNS: Record<string, string> = {
    dots: "&#9679; &#9679; &#9679; &#9679; &#9679;",
    stars: "&#9733; &#9733; &#9733;",
    wave: "&#126; &#126; &#126; &#126; &#126; &#126; &#126;",
    diamond: "&#9670; &#9670; &#9670;",
  }
  const pattern = PATTERNS[block.style] ?? PATTERNS.dots

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td align="${align}" style="padding:12px 24px;font-family:Arial,sans-serif;font-size:16px;color:${color};letter-spacing:8px;">
      ${pattern}
    </td>
  </tr>
</table>`
}

// ─── Main renderers ───────────────────────────────────────────────────────────

export function renderBlockToEmailHtml(
  block: EmailBlock,
  productData?: ProductData[]
): string {
  switch (block.type) {
    case "text":
      return renderTextBlock(block)
    case "image":
      return renderImageBlock(block)
    case "button":
      return renderButtonBlock(block)
    case "product":
      return renderProductBlock(block, productData ?? [])
    case "divider":
      return renderDividerBlock(block)
    case "spacer":
      return renderSpacerBlock(block)
    case "heading":
      return renderHeadingBlock(block)
    case "social":
      return renderSocialBlock(block)
    case "coupon":
      return renderCouponBlock(block)
    case "columns":
      return renderColumnsBlock(block)
    case "video":
      return renderVideoBlock(block)
    case "hero":
      return renderHeroBlock(block)
    case "menu_highlight":
      return renderMenuHighlightBlock(block)
    case "countdown":
      return renderCountdownBlock(block)
    case "gallery":
      return renderGalleryBlock(block)
    case "location":
      return renderLocationBlock(block)
    case "hours":
      return renderHoursBlock(block)
    case "testimonial":
      return renderTestimonialBlock(block)
    case "decorative_divider":
      return renderDecorativeDividerBlock(block)
    default:
      return ""
  }
}

export function renderTemplateToEmailHtml(
  blocks: EmailBlock[],
  branding: EmailBranding,
  productData?: ProductData[]
): string {
  const bodyContent = blocks
    .map((block) => renderBlockToEmailHtml(block, productData))
    .join("")

  const logoSection = branding.logoUrl
    ? `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:${branding.primaryColor};">
  <tr>
    <td align="center" style="padding:24px;">
      <img src="${sanitizeUrl(branding.logoUrl)}" alt="${escapeHtml(branding.senderName)}" height="50" style="display:block;border:0;" />
    </td>
  </tr>
</table>`
    : `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:${branding.primaryColor};">
  <tr>
    <td align="center" style="padding:24px;font-family:Arial,sans-serif;font-size:20px;font-weight:bold;color:#ffffff;">
      ${escapeHtml(branding.senderName)}
    </td>
  </tr>
</table>`

  const socialLinks = branding.socialLinks
    ? Object.entries(branding.socialLinks)
        .filter(([, url]) => url)
        .map(
          ([network, url]) =>
            `<a href="${sanitizeUrl(url!)}" style="color:${branding.primaryColor};text-decoration:none;margin:0 8px;font-family:Arial,sans-serif;font-size:13px;">${escapeHtml(network)}</a>`
        )
        .join(" · ")
    : ""

  const footer = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#f8f8f8;">
  <tr>
    <td align="center" style="padding:24px;font-family:Arial,sans-serif;font-size:12px;color:#999999;line-height:1.6;">
      ${branding.footerText ? `<p style="margin:0 0 8px 0;">${escapeHtml(branding.footerText)}</p>` : ""}
      ${socialLinks ? `<p style="margin:0 0 8px 0;">${socialLinks}</p>` : ""}
      <p style="margin:0;">
        <a href="${sanitizeUrl(branding.unsubscribeUrl)}" style="color:#999999;text-decoration:underline;font-family:Arial,sans-serif;font-size:12px;">
          ${escapeHtml(branding.unsubscribeText)}
        </a>
      </p>
    </td>
  </tr>
</table>`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f0f0f0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#f0f0f0;">
    <tr>
      <td align="center" style="padding:24px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#ffffff;max-width:600px;width:100%;">
          <tr><td>${logoSection}</td></tr>
          <tr><td style="padding:0;">${bodyContent}</td></tr>
          <tr><td>${footer}</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
