import numpy as np
import pytest

from drift_diffusion.mesh import graded_mesh


def test_endpoints_and_length():
    x = graded_mesh(1e-4, 0.5e-4, 201)
    assert x[0] == 0.0
    assert x[-1] == 1e-4
    assert len(x) == 201


def test_strictly_increasing():
    x = graded_mesh(1e-4, 0.3e-4, 301, beta=6.0)
    assert np.all(np.diff(x) > 0)


def test_clustered_near_junction():
    xj = 0.5e-4
    x = graded_mesh(1e-4, xj, 401, beta=8.0)
    spacing = np.diff(x)
    idx_near_junction = np.argmin(np.abs(x - xj))
    near_spacing = spacing[max(idx_near_junction - 2, 0)]
    edge_spacing = spacing[0]
    assert near_spacing < edge_spacing / 10


def test_rejects_junction_outside_domain():
    with pytest.raises(ValueError):
        graded_mesh(1e-4, 2e-4, 100)
    with pytest.raises(ValueError):
        graded_mesh(1e-4, 0.0, 100)
