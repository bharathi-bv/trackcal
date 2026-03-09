-- Header/Footer custom code blocks for direct booking pages.
-- Used for GTM snippets and similar tag configuration.

alter table if exists public.host_settings
  add column if not exists booking_link_header_code text not null default '',
  add column if not exists booking_link_footer_code text not null default '';
