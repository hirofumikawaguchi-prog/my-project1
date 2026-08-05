"""Numerically stable Bernoulli function for Scharfetter-Gummel discretization.

    B(x) = x / (exp(x) - 1)

B is smooth everywhere but its naive evaluation is a 0/0 indeterminate
form as x -> 0, and exp(x) overflows for large positive x. This module
evaluates it piecewise:

  * |x| small  -> Taylor series  B(x) ~= 1 - x/2 + x^2/12
  * x very large (positive or negative) -> asymptotic limits (0 or -x)
  * otherwise  -> x / expm1(x), using expm1 for accuracy near zero

Useful identity (checked in tests): B(-x) - B(x) = x.
"""

import numpy as np

_SMALL = 1e-6
_LARGE = 500.0


def bernoulli(x):
    """Elementwise Bernoulli function B(x) = x / (exp(x) - 1)."""
    x_arr = np.asarray(x, dtype=float)
    scalar_input = x_arr.ndim == 0
    x_flat = np.atleast_1d(x_arr)

    out = np.empty_like(x_flat)

    small = np.abs(x_flat) < _SMALL
    out[small] = 1.0 - x_flat[small] / 2.0 + x_flat[small] ** 2 / 12.0

    rest = ~small
    xr = x_flat[rest]
    large_pos = xr > _LARGE
    large_neg = xr < -_LARGE
    mid = ~(large_pos | large_neg)

    res = np.empty_like(xr)
    res[large_pos] = 0.0
    res[large_neg] = -xr[large_neg]
    res[mid] = xr[mid] / np.expm1(xr[mid])
    out[rest] = res

    return out.item() if scalar_input else out
