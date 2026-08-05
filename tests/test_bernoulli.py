import numpy as np

from drift_diffusion.bernoulli import bernoulli


def test_scalar_matches_direct_formula_away_from_zero():
    for xv in [0.3, 1.5, -2.0, 5.0, -8.0]:
        expected = xv / (np.exp(xv) - 1.0)
        assert np.isclose(bernoulli(xv), expected, rtol=1e-10)


def test_identity_B_minus_x_minus_B_x_equals_x():
    xs = np.array([1e-7, 0.01, 0.5, 3.0, 50.0, -50.0, 400.0, -400.0])
    lhs = bernoulli(-xs) - bernoulli(xs)
    assert np.allclose(lhs, xs, rtol=1e-8, atol=1e-12)


def test_limit_at_zero_is_one():
    assert np.isclose(bernoulli(0.0), 1.0)
    assert np.isclose(bernoulli(1e-9), 1.0, atol=1e-6)


def test_large_positive_argument_decays_to_zero():
    assert bernoulli(600.0) == 0.0


def test_large_negative_argument_matches_minus_x():
    assert np.isclose(bernoulli(-600.0), 600.0)


def test_vectorized_matches_elementwise():
    xs = np.linspace(-100, 100, 501)
    vec = bernoulli(xs)
    elementwise = np.array([bernoulli(x) for x in xs])
    assert np.allclose(vec, elementwise, rtol=1e-10, atol=1e-300)
