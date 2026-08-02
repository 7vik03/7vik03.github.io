---
title: "Why sparse tensor kernels stall on Apple Silicon"
date: 2026-07-14
description: "A walk through the microarchitectural reasons irregular gather patterns underperform on M-series cores, and what the fix looks like."
---

Sparse kernels are usually described as memory-bound, which is true but not
useful. "Memory-bound" is a budget, not a mechanism. The interesting question is
*which* structure in the machine runs out first — and on the M-series cores it is
almost never bandwidth.

## The shape of the problem

A CSR SpMV inner loop does one indexed load per nonzero:

```c
for (int i = 0; i < rows; i++) {
  double acc = 0.0;
  for (int k = rowptr[i]; k < rowptr[i + 1]; k++)
    acc += vals[k] * x[colidx[k]];   // <-- the gather
  y[i] = acc;
}
```

The gather on `x` is the whole story. Everything else streams.

### Where the cycles actually go

| Structure            | Budget | Typical occupancy | Stalls? |
| -------------------- | -----: | ----------------: | ------- |
| L1D bandwidth        |  ~2/cy |              0.9  | no      |
| Load queue entries   |    128 |             ~120  | **yes** |
| L2 miss-status regs  |     ~— |          saturated| **yes** |
| DRAM bandwidth       | 100 GB/s |            38%  | no      |

The load queue fills long before the memory system does. Each unresolved gather
occupies an entry for its full latency, so the reorder window drains and the core
sits idle with bandwidth to spare.[^1]

## A rough model

If $\mu$ is the average gather latency and $Q$ the load-queue depth, sustained
throughput is bounded by

$$
\text{nnz/cycle} \;\le\; \frac{Q}{\mu}
$$

which for $Q = 128$ and $\mu \approx 90$ cycles lands near 1.4 — close to what
the hardware counters report, and nowhere near the bandwidth ceiling.

> The fix is not to move fewer bytes. It is to have fewer *outstanding, independent*
> misses in flight at any one time — i.e. to make the gathers hit.

## What tiling buys you

Blocking `x` into L1-resident panels turns most gathers into hits, which shortens
$\mu$ rather than shrinking traffic. On a 2.4 M-nonzero matrix that was a 2.1×
win with byte counts essentially unchanged — the giveaway that the original
bottleneck was never bandwidth.

- Panel width is set by L1D size, not by cache-line count.
- Reordering rows by nonzero pattern helps more than reordering columns.
- Prefetch hints help the streaming arrays and do nothing for the gather.

[^1]: Measured with `pmc` counters on an M3 Pro, single performance core, 8-wide
      decode. The load-queue figure is inferred, not documented.
