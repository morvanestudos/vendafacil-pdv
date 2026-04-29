alter table public.produtos enable row level security;
alter table public.vendas enable row level security;
alter table public.itens_venda enable row level security;

drop policy if exists "produtos_select_own" on public.produtos;
drop policy if exists "produtos_insert_own" on public.produtos;
drop policy if exists "produtos_update_own" on public.produtos;
drop policy if exists "produtos_delete_own" on public.produtos;

create policy "produtos_select_own"
on public.produtos
for select
to authenticated
using (auth.uid() = user_id);

create policy "produtos_insert_own"
on public.produtos
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "produtos_update_own"
on public.produtos
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "produtos_delete_own"
on public.produtos
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "vendas_select_own" on public.vendas;
drop policy if exists "vendas_insert_own" on public.vendas;
drop policy if exists "vendas_update_own" on public.vendas;
drop policy if exists "vendas_delete_own" on public.vendas;

create policy "vendas_select_own"
on public.vendas
for select
to authenticated
using (auth.uid() = user_id);

create policy "vendas_insert_own"
on public.vendas
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "vendas_update_own"
on public.vendas
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "vendas_delete_own"
on public.vendas
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "itens_venda_select_own" on public.itens_venda;
drop policy if exists "itens_venda_insert_own" on public.itens_venda;
drop policy if exists "itens_venda_update_own" on public.itens_venda;
drop policy if exists "itens_venda_delete_own" on public.itens_venda;

create policy "itens_venda_select_own"
on public.itens_venda
for select
to authenticated
using (auth.uid() = user_id);

create policy "itens_venda_insert_own"
on public.itens_venda
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "itens_venda_update_own"
on public.itens_venda
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "itens_venda_delete_own"
on public.itens_venda
for delete
to authenticated
using (auth.uid() = user_id);
