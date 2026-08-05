"""1D mesh generation for the PN junction.

The depletion width near an abrupt junction is typically orders of
magnitude smaller than the overall device length, so a uniform mesh
would need an impractically large number of points to resolve it. This
module builds a mesh graded (fine spacing) around the junction and
coarser away from it, using a tanh stretching function on each side.
"""

import numpy as np


def graded_mesh(length, junction_position, n_points, beta=6.0):
    """Build a 1D mesh over [0, length] clustered around junction_position.

    Parameters
    ----------
    length : float
        Total device length [cm].
    junction_position : float
        Location of the metallurgical junction [cm], strictly inside (0, length).
    n_points : int
        Total number of mesh nodes (>= 4).
    beta : float
        Stretching strength; larger values pack more points near the junction.

    Returns
    -------
    x : np.ndarray, shape (n_points,)
        Strictly increasing node coordinates with x[0] = 0, x[-1] = length.
    """
    if not (0.0 < junction_position < length):
        raise ValueError("junction_position must lie strictly inside (0, length)")
    if n_points < 4:
        raise ValueError("n_points must be at least 4")

    n_left = n_points // 2
    n_right = n_points - n_left + 1  # +1: the junction node is shared

    t_left = np.linspace(0.0, 1.0, n_left)
    # Dense spacing near t=1 (the junction, right end of the left segment).
    u_left = np.tanh(beta * t_left) / np.tanh(beta)
    x_left = junction_position * u_left

    t_right = np.linspace(0.0, 1.0, n_right)
    # Dense spacing near t=0 (the junction, left end of the right segment).
    u_right = 1.0 - np.tanh(beta * (1.0 - t_right)) / np.tanh(beta)
    x_right = junction_position + (length - junction_position) * u_right

    x = np.concatenate([x_left, x_right[1:]])
    x[0] = 0.0
    x[-1] = length
    return x
