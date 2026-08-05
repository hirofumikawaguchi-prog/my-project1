"""Scharfetter-Gummel discretization of the steady-state continuity equations.

Electron and hole current densities between adjacent nodes i, i+1
(spacing h_i, delta_i = (psi_{i+1} - psi_i) / Vt) are given by the
Scharfetter-Gummel (1969) formulas, which are exact under the
assumption of piecewise-constant field and remain numerically stable
for arbitrarily strong drift or diffusion:

    J_n(i+1/2) = (q Dn / h_i) * [ n_{i+1} B(delta_i) - n_i B(-delta_i) ]
    J_p(i+1/2) = (q Dp / h_i) * [ p_i B(delta_i) - p_{i+1} B(-delta_i) ]

where B is the Bernoulli function. At steady state:

    dJn/dx =  q * R_net
    dJp/dx = -q * R_net

with R_net the net Shockley-Read-Hall recombination rate (mid-gap
trap):

    R_net = (n p - ni^2) / (tau_p (n + ni) + tau_n (p + ni))

Solving for one carrier while holding the other fixed (Gummel
iteration) makes each continuity equation linear in the unknown
carrier if the *denominator* of R_net is evaluated with the previous
iterate. That keeps each solve a single tridiagonal linear system.
"""

import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla

from .bernoulli import bernoulli
from .constants import D_N, D_P, NI, Q, TAU_N, TAU_P, V_T


def _assemble_flux_coeffs(psi, h, D, Vt):
    """Return per-interface Bernoulli terms shared by both carriers."""
    delta = np.diff(psi) / Vt  # (N-1,)
    Bp = bernoulli(delta)      # B(delta_i)
    Bm = bernoulli(-delta)     # B(-delta_i)
    g = Q * D / h              # (N-1,) conductance-like prefactor
    return g, Bp, Bm


def _solve_scaled_tridiagonal(lower, diag, upper, rhs, scale):
    """Solve the tridiagonal system after diagonal (Jacobi-style) scaling.

    Carrier concentrations span 10+ orders of magnitude between the
    depletion region and the quasi-neutral bulk, which makes the raw
    matrix entries equally wide-ranging and destroys precision in a
    direct sparse solve. Substituting n_i = m_i * scale_i with `scale`
    close to the expected solution (the previous Gummel iterate)
    rescales every unknown to order 1 and restores solver accuracy,
    without changing the underlying equations.
    """
    N = len(scale)
    scaled_lower = lower[1:] * scale[:-1] / scale[1:]
    scaled_upper = upper[:-1] * scale[1:] / scale[:-1]
    scaled_diag = diag.copy()
    scaled_rhs = rhs / scale

    A = sp.diags([scaled_lower, scaled_diag, scaled_upper], offsets=[-1, 0, 1], format="csc")
    m = spla.spsolve(A, scaled_rhs)
    return m * scale


def solve_electron_continuity(x, psi, p, n_prev, n_left, n_right,
                               D_n=D_N, ni=NI, Vt=V_T,
                               tau_n=TAU_N, tau_p=TAU_P, recombination=True):
    """Solve q^-1 dJn/dx = R_net for n, given psi and p fixed.

    `n_prev` is the previous Gummel iterate of n, used only to freeze
    the SRH denominator so the solve stays linear in the new n.
    """
    N = len(x)
    h = np.diff(x)
    vol = 0.5 * (h[:-1] + h[1:])  # control-volume width, interior nodes

    g, Bp, Bm = _assemble_flux_coeffs(psi, h, D_n, Vt)
    # J_{i+1/2} = g_i * (n_{i+1} Bp_i - n_i Bm_i)

    lower = np.zeros(N)
    diag = np.zeros(N)
    upper = np.zeros(N)
    rhs = np.zeros(N)

    # Contribution of (J_{i+1/2} - J_{i-1/2}) / vol_i for interior i = 1..N-2.
    diag[1:-1] += (-g[1:] * Bm[1:] - g[:-1] * Bp[:-1]) / vol
    upper[1:-1] += (g[1:] * Bp[1:]) / vol
    lower[1:-1] += (g[:-1] * Bm[:-1]) / vol

    if recombination:
        D_denom = tau_p * (n_prev[1:-1] + ni) + tau_n * (p[1:-1] + ni)
        diag[1:-1] += -Q * p[1:-1] / D_denom
        rhs[1:-1] += -Q * ni ** 2 / D_denom

    diag[0] = 1.0
    rhs[0] = n_left
    diag[-1] = 1.0
    rhs[-1] = n_right

    return _solve_scaled_tridiagonal(lower, diag, upper, rhs, n_prev)


def solve_hole_continuity(x, psi, n, p_prev, p_left, p_right,
                           D_p=D_P, ni=NI, Vt=V_T,
                           tau_n=TAU_N, tau_p=TAU_P, recombination=True):
    """Solve -q^-1 dJp/dx = R_net for p, given psi and n fixed."""
    N = len(x)
    h = np.diff(x)
    vol = 0.5 * (h[:-1] + h[1:])

    g, Bp, Bm = _assemble_flux_coeffs(psi, h, D_p, Vt)
    # J_{i+1/2} = g_i * (p_i Bp_i - p_{i+1} Bm_i)

    lower = np.zeros(N)
    diag = np.zeros(N)
    upper = np.zeros(N)
    rhs = np.zeros(N)

    # J_{i+1/2} coefficient on p_i: g_i*Bp_i ; on p_{i+1}: -g_i*Bm_i
    # J_{i-1/2} coefficient on p_i: -g_{i-1}*Bm_{i-1} ; on p_{i-1}: g_{i-1}*Bp_{i-1}
    # (J_{i+1/2} - J_{i-1/2}) / vol_i, for interior i = 1..N-2:
    diag[1:-1] += (g[1:] * Bp[1:] + g[:-1] * Bm[:-1]) / vol
    upper[1:-1] += -g[1:] * Bm[1:] / vol
    lower[1:-1] += -g[:-1] * Bp[:-1] / vol

    if recombination:
        D_denom = tau_p * (n[1:-1] + ni) + tau_n * (p_prev[1:-1] + ni)
        diag[1:-1] += Q * n[1:-1] / D_denom
        rhs[1:-1] += Q * ni ** 2 / D_denom

    diag[0] = 1.0
    rhs[0] = p_left
    diag[-1] = 1.0
    rhs[-1] = p_right

    return _solve_scaled_tridiagonal(lower, diag, upper, rhs, p_prev)


def current_density(x, psi, n, p, D_n=D_N, D_p=D_P, Vt=V_T):
    """Total current density Jn + Jp at every interface (N-1,).

    At a converged steady-state solution this should be constant
    across the whole device (charge conservation) -- a useful
    numerical sanity check.
    """
    h = np.diff(x)
    g_n, Bp_n, Bm_n = _assemble_flux_coeffs(psi, h, D_n, Vt)
    g_p, Bp_p, Bm_p = _assemble_flux_coeffs(psi, h, D_p, Vt)
    Jn = g_n * (n[1:] * Bp_n - n[:-1] * Bm_n)
    Jp = g_p * (p[:-1] * Bp_p - p[1:] * Bm_p)
    return Jn + Jp
