"""Gummel (decoupled) iteration: self-consistently couple Poisson's
equation with the electron and hole continuity equations.

Each outer iteration:
  1. Freezes quasi-Fermi potentials phi_n, phi_p from the current (n, p, psi)
     and re-solves the nonlinear Poisson equation for psi.
  2. Re-solves the electron continuity equation (Scharfetter-Gummel) for n,
     given the updated psi and the previous p.
  3. Re-solves the hole continuity equation for p, given the updated psi
     and the new n.
Steps repeat until psi, n, and p stop changing.

Ohmic contacts are assumed ideal: local charge neutrality (n - p = C)
and the mass-action law (n p = ni^2) both hold exactly at the contacts,
regardless of applied bias. An applied contact voltage V shifts that
contact's quasi-Fermi level (and hence psi) by V, but not the boundary
carrier densities themselves.
"""

import numpy as np

from .constants import D_N, D_P, NI, TAU_N, TAU_P, V_T
from .continuity import current_density, solve_electron_continuity, solve_hole_continuity
from .poisson import equilibrium_potential_guess, solve_poisson


def contact_carrier_densities(C_contact, ni=NI):
    """Ideal ohmic contact: n - p = C_contact and n * p = ni^2."""
    n_c = 0.5 * (C_contact + np.sqrt(C_contact ** 2 + 4.0 * ni ** 2))
    p_c = n_c - C_contact
    return n_c, p_c


def equilibrium_initial_guess(x, C, ni=NI, Vt=V_T):
    """Charge-neutral, zero-current initial guess (exact at V=0)."""
    psi = equilibrium_potential_guess(C, ni, Vt)
    n = ni * np.exp(psi / Vt)
    p = ni * np.exp(-psi / Vt)
    return psi, n, p


def solve_bias_point(x, C, eps, V_left, V_right, psi_init, n_init, p_init,
                      ni=NI, Vt=V_T, D_n=D_N, D_p=D_P,
                      tau_n=TAU_N, tau_p=TAU_P, recombination=True,
                      max_iter=500, tol=1e-9):
    """Self-consistent steady-state solve for one bias point.

    V_left, V_right : contact voltages [V] applied at x[0] and x[-1].
    psi_init, n_init, p_init : initial guess (e.g. from the previous
        bias point, for continuation).

    Returns psi, n, p, n_iterations_used.
    """
    n_left, p_left = contact_carrier_densities(C[0], ni)
    n_right, p_right = contact_carrier_densities(C[-1], ni)
    psi_left = V_left + equilibrium_potential_guess(C[0:1], ni, Vt)[0]
    psi_right = V_right + equilibrium_potential_guess(C[-1:], ni, Vt)[0]

    psi = psi_init.copy()
    n = n_init.copy()
    p = p_init.copy()
    psi[0], psi[-1] = psi_left, psi_right
    n[0], n[-1] = n_left, n_right
    p[0], p[-1] = p_left, p_right

    iterations = max_iter
    for it in range(max_iter):
        phi_n = psi - Vt * np.log(n / ni)
        phi_p = psi + Vt * np.log(p / ni)
        phi_n[0] = phi_p[0] = V_left
        phi_n[-1] = phi_p[-1] = V_right

        psi_new, _, _ = solve_poisson(x, C, phi_n, phi_p, psi_left, psi_right,
                                       eps, psi_init=psi, ni=ni, Vt=Vt)

        n_new = solve_electron_continuity(x, psi_new, p, n, n_left, n_right,
                                           D_n=D_n, ni=ni, Vt=Vt,
                                           tau_n=tau_n, tau_p=tau_p,
                                           recombination=recombination)
        p_new = solve_hole_continuity(x, psi_new, n_new, p, p_left, p_right,
                                       D_p=D_p, ni=ni, Vt=Vt,
                                       tau_n=tau_n, tau_p=tau_p,
                                       recombination=recombination)

        d_psi = np.max(np.abs(psi_new - psi))
        d_n = np.max(np.abs(n_new - n) / np.maximum(n, 1.0))
        d_p = np.max(np.abs(p_new - p) / np.maximum(p, 1.0))

        psi, n, p = psi_new, n_new, p_new

        if d_psi < tol and d_n < 1e-8 and d_p < 1e-8:
            iterations = it + 1
            break

    return psi, n, p, iterations


def bias_sweep(x, C, eps, voltages, ni=NI, Vt=V_T, D_n=D_N, D_p=D_P,
               tau_n=TAU_N, tau_p=TAU_P, recombination=True,
               max_iter=500, tol=1e-9):
    """Solve a sequence of bias points, using continuation (each solution
    seeds the initial guess for the next voltage) for robust convergence.

    Returns a list of dicts, one per voltage, each with keys
    'V', 'psi', 'n', 'p', 'J', 'iterations'.
    """
    psi, n, p = equilibrium_initial_guess(x, C, ni, Vt)
    results = []
    for V in voltages:
        psi, n, p, iters = solve_bias_point(
            x, C, eps, V_left=V, V_right=0.0,
            psi_init=psi, n_init=n, p_init=p,
            ni=ni, Vt=Vt, D_n=D_n, D_p=D_p,
            tau_n=tau_n, tau_p=tau_p, recombination=recombination,
            max_iter=max_iter, tol=tol,
        )
        J = current_density(x, psi, n, p, D_n=D_n, D_p=D_p, Vt=Vt)
        results.append({
            "V": V,
            "psi": psi.copy(),
            "n": n.copy(),
            "p": p.copy(),
            "J": float(np.mean(J)),
            "J_profile": J,
            "iterations": iters,
        })
    return results
