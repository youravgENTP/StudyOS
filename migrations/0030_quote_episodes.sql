alter table public.quotes
  add column if not exists episode text
  check (episode is null or char_length(trim(episode)) between 1 and 40);

-- Existing Webtoon records stored episodes inside source, for example
-- `과학고 사변 24화` and `『품위증명』 10화 · 화자 어진`.
update public.quotes as quote
set episode = (regexp_match(quote.source, '([0-9]+|마지막)화([[:space:]]*·|[[:space:]]*$)'))[1],
    source = nullif(trim(
      regexp_replace(
        regexp_replace(quote.source, '[[:space:]]+([0-9]+|마지막)화[[:space:]]*·[[:space:]]*', ' · ', 'g'),
        '[[:space:]]+([0-9]+|마지막)화[[:space:]]*$', '', 'g'
      )
    ), '')
from public.quote_categories as category
where quote.category_id = category.id
  and lower(trim(category.name)) in ('웹툰', 'webtoon')
  and quote.episode is null
  and quote.source ~ '([0-9]+|마지막)화([[:space:]]*·|[[:space:]]*$)';

notify pgrst, 'reload schema';
