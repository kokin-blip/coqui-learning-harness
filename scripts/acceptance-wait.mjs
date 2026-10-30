/** Poll settled values, including asynchronous IPC predicates. Browser RAF polling treats a Promise as truthy. */
export async function waitForState(page, predicate, arg, options = {}) {
  const deadline = Date.now() + (options.timeout ?? 30000);
  let last;
  while (Date.now() < deadline) {
    last = await page.evaluate(predicate, arg);
    if (last) return last;
    await page.waitForTimeout(options.polling ?? 50);
  }
  throw new Error(
    "Acceptance condition did not settle: " +
      predicate.toString().slice(0, 300) +
      "; last=" +
      JSON.stringify(last),
  );
}
