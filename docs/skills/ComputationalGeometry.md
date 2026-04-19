# Skill: Computational Geometry for Kinetix

## 1. SVG Path Linearization
To convert `<path>` data (M, L, C, Q, Z) into physical segments:
- **Adaptive Subdivision (Recursive)**: Subdivide Cubic/Quadratic Bézier curves until the distance from the control points to the chord is less than a tolerance $\epsilon$.
- **Formula**: $distance = \frac{|(y_2-y_1)x_0 - (x_2-x_1)y_0 + x_2y_1 - y_2x_1|}{\sqrt{(y_2-y_1)^2 + (x_2-x_1)^2}}$

## 2. Convex Decomposition
Physics engines require convex shapes.
- **HACD (Hierarchical Approximate Convex Decomposition)**: Preferred for performance.
- **V-HACD**: Use voxel-based decomposition for complex shapes to ensure stability and reduce the number of collision primitives.
- **Tools**: Integration with `Rapier2D`'s decomposition or `poly-decomp-es` for exact partitioning.

## 3. Physical Properties
For a polygon with vertices $(x_i, y_i)$:
- **Area**: $A = \frac{1}{2} \sum (x_i y_{i+1} - x_{i+1} y_i)$
- **Centroid**: $C_x = \frac{1}{6A} \sum (x_i + x_{i+1})(x_i y_{i+1} - x_{i+1} y_i)$
- **Moment of Inertia**: $I = \frac{1}{12} \sum (x_i^2 + x_i x_{i+1} + x_{i+1}^2)(x_i y_{i+1} - x_{i+1} y_i)$
