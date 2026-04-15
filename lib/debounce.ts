export function debounce<A>(fn: (arg: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (arg: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(arg), ms);
  };
}
