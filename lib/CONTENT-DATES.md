# Content Dates

This file states the rule for `data/content-dates.json` and its typed reader,
`lib/content-dates.ts`. Read this before editing either one.

## The rule: what bumps a date, and what does not

Bump a page's date in `data/content-dates.json` whenever a reader would
notice something changed: new prose, a new inline link, a reworded
sentence, a new connective paragraph, a new section. Links and connective
sentences count as a visible content change exactly as much as a rewritten
paragraph does. A `lastmod` value exists to answer one question honestly,
"did this page's content change," and a reader-visible edit is always a
yes.

Do not bump a page's date for a code refactor, a test change, or a
metadata-only tweak, such as an edited `changeFrequency`, a renamed
constant, or a moved file whose rendered output is unchanged. None of
those are visible to a reader. Dating a page as though they were would
turn the `lastmod` value into a false signal, which defeats the entire
reason this module exists.

A page whose change was built but not yet publicly visible, because the
deploy that ships it has not landed, carries the date it became visible
to a reader, not the date the commit was written. An unshipped commit is
not a content change from a crawler's point of view, and dating it as one
claims freshness the public site has not earned yet.

## The two derived routes

`/blog` and `/changelog` are never hand-maintained, and neither has a key
in the `routes` map on purpose, so nobody edits either one directly by
mistake. `/blog`'s date is derived: it is the newest date across every
entry in `blogPosts`. `/changelog`'s date is also derived: it is the
newest entry date in `lib/updates-data.ts`. Both are computed by
`lib/content-dates.ts` as a maximum over their source values, not by
reading the first or last entry, so neither result depends on key or
array order in the source file.

## The sitemap restates nothing

`app/sitemap.ts` reads every `lastModified` value from this module and
contains no date literal and no current-time constructor of its own. If a
route is missing from `data/content-dates.json`, the module throws rather
than guessing at a current-time value. An inaccurate `lastmod` is not a
cosmetic defect: it is a false statement to a crawler about when a page's
content changed, and the previous arrangement made that false statement
on every single build, three times over, because it read the clock
instead of the content.
