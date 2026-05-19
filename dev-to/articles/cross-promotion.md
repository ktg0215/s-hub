---
title: "How I Cross-Promote 18 Chrome Extensions Without Annoying Users"
published: true
publish_date: "2026-04-30"
devto_id: "3519738"
tags: ["chrome","javascript","webdev","productivity"]
---

I publish Chrome extensions as a solo developer. I currently have 18 live extensions across two Chrome Web Store accounts, with more in development.

Each extension runs in isolation. A user who installs ReadMark has no reason to know that Japanese Font Finder exists — unless I tell them. This is the cross-promotion problem.

Done badly, cross-promotion is spammy: "You might also like..." banners competing with the actual UI, persistent notifications pushing other products, or promotional modals that appear on first launch. These damage trust and hurt retention.

Done well, cross-promotion is genuinely useful: surfacing a related tool at the moment a user is most likely to want it, in a way that doesn't interrupt their workflow.

Here's what I've implemented across my extensions and what actually works.

## Where Cross-Promotion Lives

The four legitimate places I've found:

**1. The onboarding screen**

Every new extension I build has a welcome screen that appears once on first install. This is the highest-engagement moment — the user has just installed, they're curious, and they have no workflow to interrupt.

The bottom of the onboarding screen includes a "You might also like" section showing 2-3 related extensions from my portfolio. The slot is populated based on the category of the extension they just installed:

- Productivity extensions → show other productivity tools
- Developer tools → show developer tools
- Japanese-language tools → show other Japan-focused tools

```typescript
const RELATED_BY_CATEGORY: Record<Category, ExtensionInfo[]> = {
  productivity: [
    { name: 'ReadMark', cws: 'https://chromewebstore.google.com/...', icon: '...' },
    { name: 'FocusGuard', cws: 'https://chromewebstore.google.com/...', icon: '...' },
  ],
  'developer-tools': [
    { name: 'Japanese Font Finder', cws: '...', icon: '...' },
    { name: 'DataBridge', cws: '...', icon: '...' },
  ],
  // ...
};
```

Conversion rate on this slot: ~8%. It's the best-performing placement I have, and it requires zero additional interruption — the user is already looking at an onboarding screen.

**2. The settings/options page**

My extensions all have a settings page accessible via the popup or options page. At the bottom, a small "Other tools by the same developer" section.

This placement has low visibility — most users never open settings — but high intent. Someone exploring settings is an engaged user. Conversion here is ~4%.

**3. Post-export or post-action moments**

Some extensions have natural completion moments. Procshot, for example, has a "Guide created" state after the user finishes recording a workflow. At this point, the task is done and the user has a second of cognitive slack.

I show a single inline suggestion: "Looking for complementary tools? Try [X]."

This feels contextually relevant rather than promotional. If someone just created a procedure guide, they might also like a tool that helps them organize notes or manage their workflow.

**4. The Chrome Web Store listing itself**

I include links to related extensions in the long description text of each CWS listing. The format:

```
---
Other tools you might find useful:
• ReadMark (save scroll position): [link]
• Procshot (create step-by-step guides): [link]
```

CWS listing descriptions don't support hyperlinks that are clickable, but the URLs are visible and some users do copy and search them. More importantly, these listings show up in Google Search, which occasionally drives cross-traffic.

## What I Don't Do

**Push notifications**: I have `notifications` permission on some extensions for functional purposes (session timers, etc.). I never use this for promotions. Push notifications are for urgent, functional information only.

**In-session banners**: No banners appear while the user is actively using the extension. The active state is for doing the thing, not for advertising other things.

**Frequency-based nudges**: No "You've been using this for 30 days — here are our other products" messages. I've seen this pattern from larger companies and I find it manipulative.

**Email capture for cross-promotion**: Chrome extensions don't have a natural email capture point, and I don't manufacture one. My extensions work without accounts.

## Measuring It

I track cross-promotion clicks with GA4 events:

```typescript
function trackCrossPromoClick(source: string, targetExtension: string): void {
  gtag('event', 'cross_promo_click', {
    source_location: source,      // 'onboarding' | 'settings' | 'post_action'
    target_extension: targetExtension,
  });
}
```

The conversion from click to install is hard to measure directly — I can see the click in GA4 but I can't easily track what happens in the CWS after the user navigates there. I proxy this with CWS install trends: when I add a cross-promotion slot pointing to Extension X, does Extension X's weekly installs increase?

Over 12 weeks, the answer has been yes, modestly — about a 15-20% lift in weekly installs for extensions that are actively promoted from related extensions. Not explosive growth, but it compounds.

## The Principle

Cross-promotion works when it answers the question "what else can help me with what I'm already trying to do?" It fails when it answers "what else can I sell this user?"

The onboarding screen converts at 8% not because users are gullible but because the recommended extensions are actually useful to someone who just installed a related tool. The relevance makes the difference.

## Extensions mentioned in this article

- Procshot: https://chromewebstore.google.com/detail/ieblehdloggcpmkncplccjofeoakhkll
- ReadMark: https://chromewebstore.google.com/detail/inejhohffndeacbihghjcobndpoejdfn
- FocusGuard: https://chromewebstore.google.com/detail/flckiddekikkjfhgleabigdpjijpcaln
- DataBridge: https://chromewebstore.google.com/detail/gbjklhkdilhnnfgikfcnahaijacnhfce

---

*I write about solo Chrome extension development at dev-tools-hub.xyz.*
