import numpy as np

from drift_diffusion.constants import EPS_SI, NI, V_T
from drift_diffusion.mesh import graded_mesh
from drift_diffusion.poisson import equilibrium_potential_guess, solve_poisson


def _equilibrium_junction(Na=1e17, Nd=1e17, n_points=401):
    length, xj = 1e-4, 0.5e-4
    x = graded_mesh(length, xj, n_points, beta=8.0)
    C = np.where(x < xj, -Na, Nd)
    phi_n = np.zeros_like(x)
    phi_p = np.zeros_like(x)
    psi_left = equilibrium_potential_guess(C[0:1])[0]
    psi_right = equilibrium_potential_guess(C[-1:])[0]
    psi, n, p = solve_poisson(x, C, phi_n, phi_p, psi_left, psi_right, EPS_SI)
    return x, C, psi, n, p


def test_built_in_potential_matches_analytic_formula():
    Na, Nd = 1e17, 1e17
    _, _, psi, _, _ = _equilibrium_junction(Na, Nd)
    Vbi_numeric = psi[-1] - psi[0]
    Vbi_analytic = V_T * np.log(Na * Nd / NI ** 2)
    assert np.isclose(Vbi_numeric, Vbi_analytic, rtol=1e-9)


def test_built_in_potential_asymmetric_doping():
    Na, Nd = 5e16, 2e18
    _, _, psi, _, _ = _equilibrium_junction(Na, Nd)
    Vbi_numeric = psi[-1] - psi[0]
    Vbi_analytic = V_T * np.log(Na * Nd / NI ** 2)
    assert np.isclose(Vbi_numeric, Vbi_analytic, rtol=1e-9)


def test_charge_neutrality_far_from_junction():
    Na, Nd = 1e17, 1e17
    _, _, _, n, p = _equilibrium_junction(Na, Nd)
    # Far from the junction the majority carrier should match the doping
    # level and the minority carrier should match ni^2 / doping.
    assert np.isclose(p[0], Na, rtol=1e-6)
    assert np.isclose(n[0], NI ** 2 / Na, rtol=1e-6)
    assert np.isclose(n[-1], Nd, rtol=1e-6)
    assert np.isclose(p[-1], NI ** 2 / Nd, rtol=1e-6)


def test_mass_action_law_holds_everywhere_at_equilibrium():
    _, _, _, n, p = _equilibrium_junction()
    np_product = n * p
    assert np.allclose(np_product, NI ** 2, rtol=1e-6)
