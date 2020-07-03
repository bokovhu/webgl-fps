export function measure(name, producer) {
    const start = Date.now();
    const result = producer();
    const end = Date.now();
    console.log(`${name} took ${end - start} ms`);
    return result;
}
