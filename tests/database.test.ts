import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("RLS, server-only RPCs, atomic upserts, lock and failure preservation", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role;",
    );
    await db.exec(
      await readFile(
        new URL("../supabase/schema.sql", import.meta.url),
        "utf8",
      ),
    );
    const begin = () =>
      db.query<{ id: string }>("select public.begin_festival_sync() as id");
    const run = (await begin()).rows[0].id;
    assert.ok(run);
    assert.equal((await begin()).rows[0].id, null);
    const records = [
      {
        content_id: "test",
        start_date: "2026-09-01",
        end_date: "2026-09-30",
        data: { title: "Before" },
        source_modified: "1",
      },
    ];
    await db.query(
      "select public.commit_festival_sync($1,$2::jsonb,$3::jsonb)",
      [run, JSON.stringify(records), "[]"],
    );
    for (const role of ["anon", "authenticated"]) {
      await db.exec("set role " + role);
      assert.equal(
        (await db.query("select * from public.festivals")).rows.length,
        1,
      );
      await assert.rejects(
        db.exec("update public.festivals set visible=false"),
      );
      await assert.rejects(begin());
      await assert.rejects(db.exec("select public.reserve_tour_call()"));
      await assert.rejects(db.exec("delete from public.festivals"));
      await assert.rejects(db.exec("select * from private.sync_runs"));
      await db.exec("reset role");
    }
    await db.exec(
      "insert into private.api_budget values((now() at time zone 'Asia/Seoul')::date,799)",
    );
    assert.equal(
      (
        await db.query<{ ok: boolean }>(
          "select public.reserve_tour_call() as ok",
        )
      ).rows[0].ok,
      true,
    );
    assert.equal(
      (
        await db.query<{ ok: boolean }>(
          "select public.reserve_tour_call() as ok",
        )
      ).rows[0].ok,
      false,
    );
    const run2 = (await begin()).rows[0].id;
    await assert.rejects(
      db.query("select public.commit_festival_sync($1,$2::jsonb,$3::jsonb)", [
        run2,
        JSON.stringify([
          { ...records[0], data: { title: "After" } },
          {
            content_id: "bad",
            start_date: "2026-10-01",
            end_date: "2026-09-01",
            data: {},
          },
        ]),
        "[]",
      ]),
    );
    assert.equal(
      (
        await db.query<{ data: { title: string } }>(
          "select data from public.festivals",
        )
      ).rows[0].data.title,
      "Before",
    );
    await db.query("select public.fail_festival_sync($1)", [run2]);
    assert.equal(
      (await db.query("select * from public.festivals")).rows.length,
      1,
    );
    const run3 = (await begin()).rows[0].id;
    await db.query(
      "select public.commit_festival_sync($1,$2::jsonb,$3::jsonb)",
      [run3, JSON.stringify(records), "[]"],
    );
    assert.equal(
      (await db.query("select * from public.festivals")).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
