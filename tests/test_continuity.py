import numpy as np

from drift_diffusion.constants import EPS_SI
from drift_diffusion.continuity import (
    current_density,
    solve_electron_continuity,
    solve_hole_continuity,
)
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


def test_electron_continuity_reproduces_equilibrium_n():
    x, C, psi, n, p = _equilibrium_junction()
    n2 = solve_electron_continuity(x, psi, p, n, n[0], n[-1], recombination=False)
    assert np.allclose(n2, n, rtol=1e-6)


def test_hole_continuity_reproduces_equilibrium_p():
    x, C, psi, n, p = _equilibrium_junction()
    p2 = solve_hole_continuity(x, psi, n, p, p[0], p[-1], recombination=False)
    assert np.allclose(p2, p, rtol=1e-6)


def test_zero_current_at_true_equilibrium():
    x, C, psi, n, p = _equilibrium_junction()
    n2 = solve_electron_continuity(x, psi, p, n, n[0], n[-1], recombination=False)
    p2 = solve_hole_continuity(x, psi, n, p, p[0], p[-1], recombination=False)
    J = current_density(x, psi, n2, p2)
    # No applied bias -> no net current. Compare against a physically
    # meaningful current scale rather than a numerically ambitious zero.
    assert np.max(np.abs(J)) < 1e-4  # A/cm^2
