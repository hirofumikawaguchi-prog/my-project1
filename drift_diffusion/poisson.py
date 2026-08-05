"""Nonlinear Poisson solver on a non-uniform 1D mesh.

Solves, for the electrostatic potential psi(x):

    d/dx( eps * dpsi/dx ) = q * (n(psi) - p(psi) - C)

with carriers expressed through fixed (Gummel-frozen) quasi-Fermi
potentials phi_n, phi_p:

    n(psi) = ni * exp((psi - phi_n) / Vt)
    p(psi) = ni * exp(-(psi - phi_p) / Vt)

C(x) is the net (signed) doping concentration Nd - Na. Dirichlet
boundary conditions fix psi at both contacts. The nonlinear system is
solved with damped Newton's method; the Jacobian is tridiagonal
(finite-volume discretization on the non-uniform mesh) and solved with
scipy's sparse solver.
"""

import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla

from .constants import NI, Q, V_T

MAX_NEWTON_STEP = 1.0  # volts; damping cap per Newton update, guards against exp overflow


def equilibrium_potential_guess(C, ni=NI, Vt=V_T):
    """Charge-neutrality potential: solves n(psi) - p(psi) = C exactly
    when phi_n = phi_p = 0, i.e. psi = Vt * asinh(C / (2 ni))."""
    return Vt * np.arcsinh(C / (2.0 * ni))


def solve_poisson(x, C, phi_n, phi_p, psi_left, psi_right, eps,
                   psi_init=None, ni=NI, Vt=V_T, tol=1e-10, max_iter=100):
    """Solve the nonlinear Poisson equation on mesh `x`.

    Parameters
    ----------
    x : (N,) array -- mesh node coordinates [cm]
    C : (N,) array -- net doping Nd - Na [cm^-3]
    phi_n, phi_p : (N,) arrays -- frozen quasi-Fermi potentials [V]
    psi_left, psi_right : float -- Dirichlet BC at x[0] and x[-1] [V]
    eps : float -- permittivity [F/cm]
    psi_init : (N,) array, optional -- initial guess; defaults to the
        charge-neutrality guess.
    tol : float -- convergence tolerance on the Newton update (volts)
    max_iter : int -- maximum Newton iterations

    Returns
    -------
    psi, n, p : (N,) arrays -- converged potential and carrier densities
    """
    N = len(x)
    h = np.diff(x)  # (N-1,) spacing between consecutive nodes

    psi = (equilibrium_potential_guess(C, ni, Vt) if psi_init is None
           else psi_init.copy())
    psi[0] = psi_left
    psi[-1] = psi_right

    for _ in range(max_iter):
        n = ni * np.exp((psi - phi_n) / Vt)
        p = ni * np.exp(-(psi - phi_p) / Vt)

        # Control-volume half-widths for interior nodes.
        h_lo = h[:-1]       # x_i - x_{i-1}, for i = 1..N-2
        h_hi = h[1:]        # x_{i+1} - x_i, for i = 1..N-2
        vol = 0.5 * (h_lo + h_hi)

        res = np.empty(N)
        lower = np.zeros(N)   # sub-diagonal (coefficient of psi_{i-1})
        diag = np.zeros(N)
        upper = np.zeros(N)   # super-diagonal (coefficient of psi_{i+1})

        a_lo = eps / (h_lo * vol)
        a_hi = eps / (h_hi * vol)

        res[1:-1] = (a_hi * (psi[2:] - psi[1:-1]) - a_lo * (psi[1:-1] - psi[:-2])
                     - Q * (n[1:-1] - p[1:-1] - C[1:-1]))
        lower[1:-1] = a_lo
        upper[1:-1] = a_hi
        diag[1:-1] = -(a_lo + a_hi) - Q * (n[1:-1] / Vt + p[1:-1] / Vt)

        # Dirichlet boundary rows.
        res[0] = psi_left - psi[0]
        diag[0] = -1.0
        res[-1] = psi_right - psi[-1]
        diag[-1] = -1.0

        J = sp.diags([lower[1:], diag, upper[:-1]], offsets=[-1, 0, 1], format="csc")
        delta = spla.spsolve(J, -res)

        step = np.clip(delta, -MAX_NEWTON_STEP, MAX_NEWTON_STEP)
        psi = psi + step
        psi[0] = psi_left
        psi[-1] = psi_right

        if np.max(np.abs(delta)) < tol:
            break

    n = ni * np.exp((psi - phi_n) / Vt)
    p = ni * np.exp(-(psi - phi_p) / Vt)
    return psi, n, p
