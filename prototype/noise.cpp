#include <iostream>
#include <cstdlib>
#include <cmath>

// pseudorandom gradients
template <typename T>
struct gradients {
    int nx, ny;
    T *x, *y;
    gradients(int nx_, int ny_) : nx(nx_), ny(ny_) {
        x = new T[nx * ny];
        y = new T[nx * ny];
        for (int j = 0; j < nx * ny; ++j) {
            T theta = rand() * 2. * M_PI / RAND_MAX;
            x[j] = sin(theta);
            y[j] = cos(theta);
        }
    }
};
// Gaussian pseudorandom gradients
template <typename T>
struct Ggradients {
    int nx, ny;
    T *x, *y;
    Ggradients(int nx_, int ny_) : nx(nx_), ny(ny_) {
        x = new T[nx * ny];
        y = new T[nx * ny];
        for (int j = 0; j < nx * ny; ++j) {
            T theta = rand() * 2. * M_PI / RAND_MAX;
            T r = sqrt(-2 * log(1. * rand() / RAND_MAX) / 2.);
            x[j] = r * sin(theta);
            y[j] = r * cos(theta);
        }
    }
};

//template <typename T>
void printimage(std::ostream & out, const float* grid, int sx, int sy) {
    out << "P3\n" << sx << " " << sy << "\n256\n";
    for (int j = 0; j < sx * sy; ++j) {
        int c = int(sin(12 * grid[j]) * 60 + 128);
        out << c << " " << c << " " << c << std::endl;
    }
}

// Reference implementation
template <typename T, class G>
T* perlin0(int sx, int sy, int nx, int ny, const G & g) {
    int size = sx * sy;
    T* val = new T[size];
    for (int py = 0, pj = 0; py < sy; ++py) {
        for (int px = 0; px < sx; ++px, ++pj) {
            T x = (px + 0.5) * nx / sx, y = (py + 0.5) * ny / sy;
            int gx0 = int(x) % nx, gx1 = (gx0 + 1) % nx;
            int gy0 = int(y) % ny, gy1 = (gy0 + 1) % ny;
            int j00 = gx0 + gy0 * nx, j01 = gx0 + gy1 * nx;
            int j10 = gx1 + gy0 * nx, j11 = gx1 + gy1 * nx;
            T ax = x - int(x), bx = 1 - ax;
            T cax = ax*ax*(3-2*ax), cbx = 1 - cax;
            T ay = y - int(y), by = 1 - ay;
            T cay = ay*ay*(3-2*ay), cby = 1 - cay;
            val[pj] = (-ax*g.x[j00] - ay*g.y[j00]) * cbx * cby
                    + (-ax*g.x[j01] + by*g.y[j01]) * cbx * cay
                    + ( bx*g.x[j10] - ay*g.y[j10]) * cax * cby
                    + ( bx*g.x[j11] + by*g.y[j11]) * cax * cay;
        }
    }
    return val;
}

// Precompute 1-dimensional numbers
template <typename T>
T* perlin1(int sx, int sy, int nx, int ny, gradients<T> g) {
    int size = sx * sy;
    T *val = new T[size];
    int *gx0 = new int[sx], *gx1 = new int[sx];
    T *ax = new T[sx], *bx = new T[sx], *cax = new T[sx], *cbx = new T[sx];
    for (int px = 0; px < sx; ++px) {
        T x = (px + 0.5) * nx / sx;
        gx0[px] = int(x) % nx;
        gx1[px] = (gx0[px] + 1) % nx;
        T axj = x - int(x), bxj = 1 - axj;
        ax[px] = axj;
        bx[px] = bxj;
        cax[px] = axj*axj*(3-2*axj);
        cbx[px] = 1 - cax[px];
    }
    for (int py = 0, pj = 0; py < sy; ++py) {
        T y = (py + 0.5) * ny / sy;
        int gy0j = int(y) % ny;
        int gy1j = (gy0j + 1) % ny;
        T ayj = y - int(y), byj = 1 - ayj;
        T cayj = ayj*ayj*(3-2*ayj), cbyj = 1 - cayj;
        for (int px = 0; px < sx; ++px, ++pj) {
            int gx0j = gx0[px], gx1j = gx1[px];
            T axj = ax[px], bxj = bx[px], caxj = cax[px], cbxj = cbx[px];
            int j00 = gx0j + gy0j * nx, j01 = gx0j + gy1j * nx;
            int j10 = gx1j + gy0j * nx, j11 = gx1j + gy1j * nx;
            val[pj] = (-axj*g.x[j00] - ayj*g.y[j00]) * cbxj * cbyj
                    + (-axj*g.x[j01] + byj*g.y[j01]) * cbxj * cayj
                    + ( bxj*g.x[j10] - ayj*g.y[j10]) * caxj * cbyj
                    + ( bxj*g.x[j11] + byj*g.y[j11]) * caxj * cayj;
        }
    }
    return val;
}



int main() {
    int sx = 1024, sy = sx, nx = 32, ny = nx;
    gradients<float> g(nx, ny);
    float* grid = perlin0<float>(sx, sy, nx, ny, g);
    printimage(std::cout, grid, sx, sy);
}

