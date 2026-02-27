-- Service regions for the UK coverage map.
-- Status controls the colour: active (brand tan), coming_soon (dark grey), inactive (hidden).

create type region_status as enum ('active', 'coming_soon', 'inactive');

create table public.service_regions (
  id text primary key,
  name text not null,
  status region_status not null default 'inactive',
  updated_at timestamptz default now()
);

alter table public.service_regions enable row level security;

create policy "Anyone can read service_regions"
  on public.service_regions for select
  using (true);

create policy "Authenticated users can update service_regions"
  on public.service_regions for update
  using (auth.role() = 'authenticated');

insert into public.service_regions (id, name, status) values
  ('teesside', 'Teesside', 'coming_soon'),
  ('cheshire', 'Cheshire', 'active'),
  ('lancashire', 'Lancashire', 'active'),
  ('east_riding', 'East Riding', 'coming_soon'),
  ('lincolnshire', 'Lincolnshire', 'coming_soon'),
  ('north_yorkshire', 'North Yorkshire', 'active'),
  ('derbyshire', 'Derbyshire', 'active'),
  ('leicestershire', 'Leicestershire', 'coming_soon'),
  ('nottinghamshire', 'Nottinghamshire', 'active'),
  ('herefordshire', 'Herefordshire', 'coming_soon'),
  ('shropshire', 'Shropshire', 'coming_soon'),
  ('staffordshire', 'Staffordshire', 'active'),
  ('bristol', 'Bristol', 'coming_soon'),
  ('gloucestershire', 'Gloucestershire', 'coming_soon'),
  ('devon', 'Devon', 'coming_soon'),
  ('dorset', 'Dorset', 'coming_soon'),
  ('wiltshire', 'Wiltshire', 'coming_soon'),
  ('cambridgeshire', 'Cambridgeshire', 'coming_soon'),
  ('bedfordshire', 'Bedfordshire', 'coming_soon'),
  ('essex', 'Essex', 'coming_soon'),
  ('kent', 'Kent', 'coming_soon'),
  ('berkshire', 'Berkshire', 'coming_soon'),
  ('buckinghamshire', 'Buckinghamshire', 'coming_soon'),
  ('east_sussex', 'East Sussex', 'coming_soon'),
  ('hampshire', 'Hampshire', 'coming_soon'),
  ('isle_of_wight', 'Isle of Wight', 'coming_soon'),
  ('county_durham', 'County Durham', 'coming_soon'),
  ('cornwall', 'Cornwall', 'coming_soon'),
  ('northumberland', 'Northumberland', 'coming_soon'),
  ('cumbria', 'Cumbria', 'active'),
  ('hertfordshire', 'Hertfordshire', 'coming_soon'),
  ('norfolk', 'Norfolk', 'coming_soon'),
  ('northamptonshire', 'Northamptonshire', 'coming_soon'),
  ('oxfordshire', 'Oxfordshire', 'coming_soon'),
  ('somerset', 'Somerset', 'coming_soon'),
  ('suffolk', 'Suffolk', 'coming_soon'),
  ('surrey', 'Surrey', 'coming_soon'),
  ('warwickshire', 'Warwickshire', 'coming_soon'),
  ('west_sussex', 'West Sussex', 'coming_soon'),
  ('worcestershire', 'Worcestershire', 'coming_soon'),
  ('greater_manchester', 'Greater Manchester', 'active'),
  ('merseyside', 'Merseyside', 'active'),
  ('south_yorkshire', 'South Yorkshire', 'active'),
  ('tyne_and_wear', 'Tyne and Wear', 'coming_soon'),
  ('west_midlands_met', 'West Midlands', 'active'),
  ('west_yorkshire', 'West Yorkshire', 'active'),
  ('london', 'London', 'coming_soon'),
  ('scotland', 'Scotland', 'coming_soon'),
  ('wales', 'Wales', 'active'),
  ('northern_ireland', 'Northern Ireland', 'coming_soon');
