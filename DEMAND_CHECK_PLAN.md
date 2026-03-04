# CitaCal Demand Check Plan

Last updated: 2026-02-28

## Goal
Validate whether paid-acquisition teams, demand gen operators, and RevOps-minded teams will actively care about an attribution-safe scheduler before pushing harder on distribution.

CitaCal's strongest wedge is not "calendar booking."
It is:

- preserving UTMs and click IDs through booking conversion
- sending booking + attribution data to CRM/webhooks
- handling team round-robin with real availability

That means the best early audience is not generic productivity users.
It is operators who already feel the pain of attribution loss and off-domain schedulers.

## What the current market signal says

Based on current Reddit threads and CitaCal's current product positioning, there is clear problem awareness around:

- losing `gclid` / UTMs when traffic moves into Calendly or other third-party schedulers
- unreliable attribution when bookings happen off-domain or inside embeds
- weak visibility into which campaigns actually generated booked demos
- the need to route bookings to a team without breaking tracking

Useful evidence threads:

- r/googleads: "Need help: Passing gclid from Calendly to Google Ads via Zapier" (April 11, 2025, with later activity through December 26, 2025)
  - https://www.reddit.com/r/googleads/comments/1jwxnl4/need_help_passing_gclid_from_calendly_to_google/
- r/PPC: "Calendly bookings as the main goal - just not working???" (May 26, 2025)
  - https://www.reddit.com/r/PPC/comments/1kvdnz2/
- r/GoogleAnalytics: "Event Tracking / Third-Party Attribution" (March 12, 2025)
  - https://www.reddit.com/r/GoogleAnalytics/comments/1j9o7tz/
- r/googleads: "Conversion tracking" with a February 20, 2026 update noting backend event tracking worked better than thank-you pages for third-party systems
  - https://www.reddit.com/r/googleads/comments/1at5ec4/conversion_tracking/
- r/marketing: "Seeking Insight on a Surge in Spam Leads Affecting Our Calendars" (February 11, 2025)
  - https://www.reddit.com/r/marketing/comments/1in5qyw/

Meta-signal about how Reddit itself behaves in B2B:

- r/b2bmarketing: "Reddit drove 1M views and is now our top lead source, but analytics shows almost nothing" (February 25, 2026)
  - https://www.reddit.com/r/b2bmarketing/comments/1reda7d/reddit_drove_1m_views_and_is_now_our_top_lead/
- r/b2bmarketing: "Is Reddit marketing actually effective for B2B leads?" (January 2026)
  - https://www.reddit.com/r/b2bmarketing/comments/1qe12wn/is_reddit_marketing_actually_effective_for_b2b/

Interpretation:

- The pain is real.
- The audience describes the problem in plain language already.
- Reddit will punish obvious promotion.
- A comment-first, problem-first demand check is the right approach.

## Channel principles

### Reddit

Treat Reddit as:

- pain discovery
- message mining
- trust building
- selective demand capture

Do not treat Reddit as:

- product launch broadcast
- cross-posted founder spam
- "I built X, roast me" in buyer communities

Platform-level guidance to respect:

- Reddiquette says self-promotion should stay "within reason" and cites a common `9:1` rule of thumb for non-self-promotional vs self-promotional submissions.
- https://support.reddithelp.com/hc/en-us/articles/205926439-Reddiquette

Observed community pattern from current B2B Reddit threads:

- people do not respond well to overt tool promotion
- value-first comments do better than links
- repeated posting across subs gets called out as spam

### LinkedIn

Treat LinkedIn as:

- operator credibility building
- public problem framing
- social proof capture
- warm inbound discovery

Do not treat LinkedIn as:

- engagement bait
- generic AI-written listicles
- product-only sales posts

Official LinkedIn guidance to respect:

- professional/community policies:
  - https://www.linkedin.com/legal/professional-community-policies
- content recommendation guidance:
  - https://www.linkedin.com/blog/content-recommendations-avoid

Key implications from those policies:

- avoid promotional-only posts with no insight
- avoid repetitive or untargeted outreach
- avoid comments that are just plugs
- keep claims accurate and professional

## Best communities for CitaCal

### Tier 1: closest to the pain

| Community | Why it fits | Use mode | Risk |
| --- | --- | --- | --- |
| r/PPC | Direct attribution pain, ad platform tracking, off-domain conversion problems | Comment first, then carefully framed question post | High promo sensitivity |
| r/googleads | Concrete `gclid` and conversion tracking problems | Comment first only | Very high promo sensitivity |
| r/GoogleAnalytics | Attribution/debugging audience | Comment first, occasional technical question post | Medium |
| r/marketing | Broader but relevant paid/growth audience | Problem-led discussion post | Medium |
| r/DigitalMarketing | Similar to r/marketing, slightly more open to tooling discussions | Discussion post plus comments | Medium |
| r/b2bmarketing | Strong fit for demo-booked attribution and RevOps angle | Post thought-provoking problem framing, not product launch | Medium |

### Tier 2: useful, but secondary

| Community | Why it fits | Use mode | Risk |
| --- | --- | --- | --- |
| r/hubspot | CRM + attribution + meeting handoff pain | Comment when thread is exact-match | Medium |
| r/MarketingAutomation | Webhooks, lead routing, workflow discussions | Comment first | Medium |
| r/SaaS | Good for founder messaging feedback, not buyer validation | Founder-only discussion | High noise |

### Communities to avoid for initial demand check

- broad founder/self-promo subs as the primary signal source
- subreddits where your best post would still mostly attract other builders, not actual operators
- any subreddit where current rules or moderator behavior clearly reject tool mentions

## Community-safe rules for posting and commenting

Follow these rules every time:

1. Never open with the product.
2. Lead with the problem, workflow, or data point.
3. Do not drop a link in the initial Reddit post unless the subreddit explicitly allows it.
4. Do not cross-post the same text into multiple subreddits.
5. If someone asks what tool you use, disclose clearly: "I'm building CitaCal, so take this with bias."
6. Avoid fake neutrality. If recommending your own product, say so.
7. Prefer asking for current workflow details over asking "would you use this?"
8. If a thread is older than 30 days, use it for message mining, not commenting.
9. If moderators remove a post, do not repost a slightly reworded version in the same subreddit.
10. Keep screenshots and claims concrete. No vague "fix attribution forever" language.

## What to measure

Demand check success is not upvotes alone.

Track these:

- number of qualified replies from PPC, demand gen, or RevOps practitioners
- number of comments that describe the pain in their own words
- number of users asking how you solved it
- number of inbound DMs
- number of waitlist/demo signups attributed to Reddit or LinkedIn
- number of discovery calls booked

Minimum success threshold for this round:

- 20+ meaningful comments/replies across both channels
- 8+ qualified conversations or DMs
- 5+ people explicitly asking for the solution or workflow
- 3+ repeat pain statements that match CitaCal's core wedge

## Before posting: instrumentation

Do this first or the demand check will be noisy.

1. Add a `How did you hear about us?` field to your signup, waitlist, or booking form.
2. Create simple memorable paths:
   - `/reddit`
   - `/linkedin`
   - `/attribution`
3. Use one CTA only for this test:
   - waitlist
   - short demo request
   - "reply here / DM me if you want the checklist"
4. Log source manually in a sheet:
   - date
   - channel
   - subreddit or post URL
   - hook used
   - reactions
   - DMs
   - signups
   - exact pain words used

## Reddit execution plan

### Phase 1: comment-first validation

Duration: 7 days

Target:

- 2 to 4 high-value comments per day
- no product links
- no new posts for the first 3 days

What to look for:

- recent threads about Calendly, booking attribution, `gclid`, UTMs, off-domain conversions, demo-booked tracking, spam bookings, round-robin routing, webhooks, CRM sync

Search queries to run daily:

- `site:reddit.com/r/PPC Calendly attribution reddit`
- `site:reddit.com/r/googleads gclid Calendly reddit`
- `site:reddit.com/r/GoogleAnalytics third party booking attribution reddit`
- `site:reddit.com/r/marketing booking attribution reddit`
- `site:reddit.com/r/b2bmarketing demo attribution reddit`

Comment structure:

1. Restate the problem in the user's language.
2. Explain why it breaks.
3. Give a practical workaround or diagnostic checklist.
4. End with one question about their stack or constraints.
5. Mention CitaCal only if directly asked.

#### Comment template 1: attribution loss

Use when someone is losing conversion tracking across Calendly or another external scheduler:

```text
What usually breaks here is not the ads platform itself, it's the handoff between your site and the scheduler.

Once the booking happens off-domain or inside an embed, you often lose the click ID / source context unless you're persisting it before the handoff and attaching it again on booking confirmation.

The first things I'd check are:
1. where the click ID is stored
2. whether the scheduler can receive hidden fields or webhook payload data
3. whether the final conversion is being sent from the backend vs a thank-you page

Are you trying to optimize for booked demo, qualified demo, or closed-won?
```

#### Comment template 2: spam bookings / sales routing

Use when someone complains about bad leads or manual scheduling:

```text
A lot of teams treat scheduling as an ops detail, but it becomes a funnel problem fast.

If low-quality leads can occupy real calendar inventory, then your booking layer is affecting both conversion rate and rep capacity.

I'd look at three things:
- disposable email / spam filtering before the slot is locked
- routing rules for which rep gets the meeting
- whether attribution is preserved on the booking record so you can see which campaigns are feeding the junk

Are you routing manually today or through round-robin?
```

### Phase 2: create new posts

Start only after:

- you have 8 to 12 quality comments
- your account has recent non-promotional activity
- you have clearer language from real users

Post cadence:

- 2 Reddit posts per week max
- 1 subreddit per post
- wait 72 hours before posting a similar angle elsewhere

#### Best first post angles

##### r/PPC

Title:

`How are you preserving gclid / li_fat_id once traffic leaves your site for booking?`

Body:

```text
We've been digging into booked-demo attribution and the weak point seems to be the scheduler handoff.

The common pattern I'm seeing:
- ad click is tagged correctly
- landing page captures UTMs / click IDs
- user books through Calendly or another external scheduler
- booked-demo reporting in the ads platform is incomplete or wrong

If you've solved this cleanly, what ended up being the most reliable setup?

- hidden fields?
- webhook + server-side event?
- custom thank-you page?
- just optimizing for softer conversions instead?

Interested in what is actually holding up in production right now.
```

Why this works:

- it is clearly about workflow, not a launch
- it invites practitioners to share stack details
- it maps directly to CitaCal's core wedge

##### r/marketing or r/DigitalMarketing

Title:

`Where does attribution usually break in your funnel: form submit, scheduler, CRM, or reporting?`

Body:

```text
Trying to pressure-test something with people who actually own pipeline reporting.

For teams running paid acquisition into demo bookings, where does attribution usually fall apart in practice?

The failure modes I keep seeing are:
- scheduler lives off-domain
- click IDs aren't stored before booking
- round-robin / rep assignment loses the source context
- CRM gets a meeting but not the original campaign data

Curious which part is actually the biggest source of pain in your stack.
```

##### r/b2bmarketing

Title:

`Do you trust "demo booked" attribution if the scheduler is off-domain?`

Body:

```text
Serious question for B2B marketers and RevOps folks:

If someone clicks a paid ad, lands on your site, then books through Calendly or another third-party scheduler, do you actually trust the attribution on that booked demo?

I keep hearing two opposite answers:
- "close enough, just use a thank-you page"
- "no chance, backend event or CRM reconciliation only"

What are people actually relying on in 2026?
```

### Phase 3: controlled mention of CitaCal

Only do this if users start asking:

- "what are you using?"
- "did you solve this?"
- "is there a tool for this?"

Response template:

```text
Full disclosure: I'm building CitaCal around exactly this problem, so take this with bias.

The reason we went that direction is that most schedulers handle booking UX fine, but attribution usually breaks at the handoff or never reaches the CRM cleanly.

Happy to share the approach or screenshots here if that would be useful.
```

Do not:

- post your landing page immediately
- say "DM me" in every comment
- hijack unrelated threads

## LinkedIn execution plan

### Positioning

Your LinkedIn content should frame you as:

- someone who understands paid acquisition mechanics
- someone who has seen booked-demo attribution fail in the wild
- someone building from real operator pain, not from generic SaaS ambition

### Content pillars

Use 3 pillars only:

1. attribution pain
2. workflow teardown
3. build proof / what changed after fixing it

### Posting cadence

For 3 weeks:

- 3 posts per week
- 5 to 10 thoughtful comments per week on relevant operator posts
- 1 founder DM follow-up only after someone meaningfully engages

### LinkedIn post ideas

#### Post 1: problem framing

Hook:

`Booked demo attribution is where a lot of paid media reporting quietly falls apart.`

Body:

```text
Most teams think the hard part is getting the click.

Often the harder part is keeping the source intact all the way to the booked meeting.

The common failure point:

ad click -> landing page -> external scheduler -> CRM

Somewhere in that chain, UTMs or click IDs disappear.

So the dashboard says "Direct" or gives partial credit.
The rep gets the meeting.
Marketing loses the truth.

If you run paid acquisition into booked demos:
where does attribution break most often in your stack?
```

CTA:

`Curious what people trust in production now: thank-you pages, webhooks, CRM reconciliation, or something else?`

#### Post 2: teardown

Hook:

`Why "book a demo" funnels look simpler than they are.`

Body:

```text
A booked-demo funnel is usually treated like a front-end conversion problem.

It is actually 4 problems:

1. availability logic
2. source persistence
3. routing to the right rep
4. CRM handoff

If any one of those breaks, the meeting can still happen while attribution becomes fiction.

That's why teams often think paid is underperforming when the pipeline says otherwise.
```

CTA:

`What part of this chain causes the most operational pain for your team?`

#### Post 3: build-in-public with credibility

Hook:

`A scheduler should not be the reason your paid attribution breaks.`

Body:

```text
I've been working through one specific product question:

Can the booking layer preserve click IDs, route the meeting to the right person, and still stay simple for the buyer?

The surprising part isn't the booking UI.
It's how much GTM / webhook / CRM duct tape teams accept as normal once the scheduler sits outside their core stack.

Still validating where the pain is sharpest:
- missing click IDs
- off-domain conversions
- round-robin routing
- weak CRM payloads

If you own paid or RevOps, I'd love to compare notes.
```

#### Post 4: proof / insight post

Hook:

`Reddit taught me something useful about demand checks: the signal is in the pain language, not the upvotes.`

Body:

```text
The best replies are not:
"cool product"

They're:
"we lose gclid when the user books"
"Calendly breaks attribution for us"
"thank-you page tracking isn't reliable"
"our reps get meetings but the source is wrong"

That kind of language tells you the problem is real.
It also tells you what the product page should say.
```

CTA:

`What pain sentence do you hear over and over in your category?`

### LinkedIn comment strategy

Comment on posts from:

- PPC consultants
- demand gen leaders
- RevOps operators
- HubSpot / CRM implementers
- B2B founders discussing demo funnels

Comment structure:

1. add one concrete operational point
2. mention the failure mode
3. ask a real follow-up question

Example:

```text
The off-domain scheduler point matters more than most teams realize.

I've seen cases where the rep gets the booked meeting, but the original click ID never makes it into the CRM, so marketing looks worse than reality.

Are you seeing this more at the scheduler layer or in CRM sync?
```

## What not to post

Avoid these formats on both channels:

- "I built an alternative to Calendly"
- "Launching CitaCal today"
- "Roast my landing page"
- "Anyone want to try my product?"
- "Like/comment if you agree"
- any post using generic AI phrasing without concrete operator detail

## Suggested 21-day sequence

### Days 1-3

- finalize measurement setup
- warm up Reddit account with genuine comments
- publish 1 LinkedIn problem-framing post
- leave 5 LinkedIn comments on relevant operator posts

### Days 4-7

- leave 2 to 4 Reddit comments per day on exact-match pain threads
- publish 1 LinkedIn teardown post
- document exact pain phrases from replies

### Days 8-10

- publish first Reddit post in `r/PPC` or `r/marketing`
- keep comments going
- publish 1 LinkedIn build/credibility post

### Days 11-14

- if first Reddit post is accepted, publish second post in a different subreddit
- reply to every serious comment
- invite only the most relevant responders to a short conversation

### Days 15-21

- publish 2 more LinkedIn posts based on the strongest discussion theme
- compile the repeated objections / phrases
- decide whether the wedge is strongest around:
  - booked-demo attribution
  - off-domain scheduler pain
  - round-robin + attribution
  - CRM/webhook handoff

## Decision rules after the test

### Strong demand

Signals:

- people describe the pain unprompted
- they ask how to solve it, not whether the problem exists
- they compare current workarounds
- they ask for access, demo, or screenshots

Action:

- turn the strongest angle into the homepage headline
- create a short explainer asset
- start direct outreach to the best-fit responders

### Weak demand

Signals:

- people agree vaguely but do not care enough to discuss workflow
- engagement comes mostly from founders, not operators
- no one asks for the solution

Action:

- narrow the audience further
- reposition toward the sharpest use case
- do not scale posting yet

## Highest-probability initial messaging

Based on current repo context plus live discussion patterns, the best initial message is:

`CitaCal helps teams running paid acquisition preserve booking attribution through the scheduler layer, then route the meeting to the right rep with the source still intact.`

Not this:

`CitaCal is a better scheduling tool.`

## Source notes

These sources informed the plan:

- CitaCal repo context and landing page copy in this workspace
- Reddit Help: Reddiquette
  - https://support.reddithelp.com/hc/en-us/articles/205926439-Reddiquette
- LinkedIn Professional Community Policies
  - https://www.linkedin.com/legal/professional-community-policies
- LinkedIn Content Recommendations: What to Avoid
  - https://www.linkedin.com/blog/content-recommendations-avoid
- Reddit threads listed above, current as checked on 2026-02-28

Where subreddit-specific moderation behavior is described above, that is partly inferred from visible thread outcomes and current community norms, not from a complete capture of each subreddit's sidebar rules.
