import numpy as np

from drift_diffusion.constants import EPS_SI, V_T
from drift_diffusion.continuity import current_density
from drift_diffusion.gummel import bias_sweep
from drift_diffusion.mesh import graded_mesh


def _device(Na=1e17, Nd=1e17, n_points=401):
    length, xj = 2e-4, 1e-4
    x = graded_mesh(length, xj, n_points, beta=8.0)
    C = np.where(x < xj, -Na, Nd)
    return x, C


def test_forward_current_increases_monotonically():
    x, C = _device()
    voltages = [0.3, 0.35, 0.4, 0.45, 0.5]
    results = bias_sweep(x, C, EPS_SI, voltages)
    J = np.array([r["J"] for r in results])
    assert np.all(np.diff(J) > 0)


def test_forward_current_roughly_exponential_in_voltage():
    # Ideal-diode-like behavior: J(V+dV)/J(V) ~= exp(dV / Vt) once the
    # diffusion current dominates over generation-recombination current
    # (true for this device around 0.4-0.5 V).
    x, C = _device()
    dV = 0.05
    voltages = [0.40, 0.40 + dV, 0.45, 0.45 + dV]
    results = bias_sweep(x, C, EPS_SI, voltages)
    J = {round(r["V"], 6): r["J"] for r in results}
    for V in (0.40, 0.45):
        ratio = J[round(V + dV, 6)] / J[round(V, 6)]
        expected = np.exp(dV / V_T)
        assert np.isclose(ratio, expected, rtol=0.15)


def test_reverse_current_much_smaller_than_forward():
    x, C = _device()
    results = bias_sweep(x, C, EPS_SI, [-0.5, 0.5])
    J_reverse, J_forward = (r["J"] for r in results)
    assert abs(J_reverse) < 1e-3 * abs(J_forward)


def test_current_is_conserved_across_the_device():
    """At steady state, Jn + Jp must be constant across x (charge
    conservation) -- verify the simulated total current has small
    spatial variation compared to its own magnitude."""
    x, C = _device()
    results = bias_sweep(x, C, EPS_SI, [0.4])
    r = results[0]
    J = current_density(x, r["psi"], r["n"], r["p"])
    spread = J.max() - J.min()
    assert spread < 0.05 * np.abs(J.mean())
