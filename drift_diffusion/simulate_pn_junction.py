"""Example: 1D abrupt silicon PN junction, solved with the Scharfetter-Gummel
drift-diffusion model and Gummel iteration.

Produces:
  * equilibrium band diagram, carrier profiles, and electric field
  * a forward/reverse bias I-V sweep, compared against the ideal diode law

Run as:  python -m drift_diffusion.simulate_pn_junction
"""

import numpy as np

from .constants import D_N, D_P, EPS_SI, NI, Q, TAU_N, TAU_P, V_T
from .gummel import bias_sweep
from .mesh import graded_mesh


def build_device(length=2e-4, junction_position=1e-4, n_points=601,
                  Na=1e17, Nd=1e17, beta=8.0):
    """Abrupt PN junction: p-type for x < junction_position, n-type after."""
    x = graded_mesh(length, junction_position, n_points, beta=beta)
    C = np.where(x < junction_position, -Na, Nd)
    return x, C


def ideal_diode_law(V, Na, Nd, length_p, length_n,
                     D_n=D_N, D_p=D_P, tau_n=TAU_N, tau_p=TAU_P, ni=NI, Vt=V_T):
    """Shockley ideal diode law for comparison, using the long-base
    approximation (quasi-neutral regions much longer than the diffusion
    length; reasonable for the default device dimensions here)."""
    Ln = np.sqrt(D_n * tau_n)
    Lp = np.sqrt(D_p * tau_p)
    n_p0 = ni ** 2 / Na  # equilibrium minority electron density on the p side
    p_n0 = ni ** 2 / Nd  # equilibrium minority hole density on the n side
    J0 = Q * (D_n * n_p0 / Ln + D_p * p_n0 / Lp)
    return J0 * (np.exp(V / Vt) - 1.0)


def run(length=2e-4, junction_position=1e-4, n_points=601,
        Na=1e17, Nd=1e17, voltages=None):
    if voltages is None:
        # Basic (decoupled) Gummel iteration slows down sharply above
        # ~0.6 V for this device as high-level injection sets in; a
        # fully-coupled Newton solve would be needed to push further.
        voltages = np.concatenate([
            np.linspace(-1.0, -0.1, 5),
            np.linspace(0.0, 0.6, 13),
        ])

    x, C = build_device(length, junction_position, n_points, Na, Nd)
    results = bias_sweep(x, C, EPS_SI, voltages)

    equilibrium = next(r for r in results if r["V"] == 0.0)
    return x, C, results, equilibrium


def _electric_field(x, psi):
    return -np.gradient(psi, x)


def make_plots(x, results, equilibrium, Na, Nd, length_p, length_n, out_prefix="pn_junction"):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    psi_eq, n_eq, p_eq = equilibrium["psi"], equilibrium["n"], equilibrium["p"]
    x_um = x * 1e4  # cm -> micron

    fig, axes = plt.subplots(2, 2, figsize=(11, 8))

    ax = axes[0, 0]
    ax.plot(x_um, psi_eq, color="tab:blue")
    ax.set_xlabel("x [um]")
    ax.set_ylabel("Electrostatic potential [V]")
    ax.set_title("Equilibrium band bending")
    ax.grid(alpha=0.3)

    ax = axes[0, 1]
    ax.semilogy(x_um, n_eq, label="n(x)", color="tab:red")
    ax.semilogy(x_um, p_eq, label="p(x)", color="tab:blue")
    ax.set_xlabel("x [um]")
    ax.set_ylabel("Carrier density [cm^-3]")
    ax.set_title("Equilibrium carrier profiles")
    ax.legend()
    ax.grid(alpha=0.3, which="both")

    ax = axes[1, 0]
    E = _electric_field(x, psi_eq)
    ax.plot(x_um, E, color="tab:green")
    ax.set_xlabel("x [um]")
    ax.set_ylabel("Electric field [V/cm]")
    ax.set_title("Equilibrium electric field")
    ax.grid(alpha=0.3)

    ax = axes[1, 1]
    V = np.array([r["V"] for r in results])
    J = np.array([r["J"] for r in results])
    order = np.argsort(V)
    V, J = V[order], J[order]
    J_ideal = ideal_diode_law(V, Na, Nd, length_p, length_n)
    ax.semilogy(V, np.abs(J), "o-", label="Scharfetter-Gummel (simulated)", color="tab:purple")
    ax.semilogy(V, np.abs(J_ideal), "--", label="Ideal diode law", color="tab:gray")
    ax.set_xlabel("Applied voltage [V]")
    ax.set_ylabel("|J| [A/cm^2]")
    ax.set_title("I-V characteristic")
    ax.legend()
    ax.grid(alpha=0.3, which="both")

    fig.tight_layout()
    fig.savefig(f"{out_prefix}.png", dpi=150)
    print(f"Saved plots to {out_prefix}.png")


def main():
    length = 2e-4
    junction_position = 1e-4
    Na = 1e17
    Nd = 1e17

    x, C, results, equilibrium = run(length, junction_position, Na=Na, Nd=Nd)

    Vbi = equilibrium["psi"][-1] - equilibrium["psi"][0]
    Vbi_analytic = V_T * np.log(Na * Nd / NI ** 2)
    print(f"Built-in potential: simulated={Vbi:.6f} V, analytic={Vbi_analytic:.6f} V")

    for r in results:
        print(f"V={r['V']:+.3f} V   J={r['J']:+.4e} A/cm^2   Gummel iters={r['iterations']}")

    make_plots(x, results, equilibrium, Na, Nd,
               length_p=junction_position, length_n=length - junction_position)


if __name__ == "__main__":
    main()
