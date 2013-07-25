WebGL Stipple image generator
=============================

This project is a WebGL implementation of the paper [_Weighted Voronoi Stippling_](http://mrl.nyu.edu/~ajsecord/npar2002/npar2002_ajsecord_preprint.pdf)  by [Secord](http://mrl.nyu.edu/~ajsecord).

Program Summary
---------------

First, given a source image, a [Voronoi Diagram](http://en.wikipedia.org/wiki/Voronoi_diagram) is generated. In short, using a specific number of points, the given space is divided into the same number of regions as points using specific guidelines. The result is a Voronoi Diagram. These points will be used to create a stipple image. 

Using the algorithms described in the paper, the Voronoi Diagram is iteratively converted to be "centroidal". That is, all the points are located at the centroid of their respective regions. However, these centroids are weighted based off the pixel density of the source image. This means that darker areas of the source image will have more points, and thus more stipples.

The Voronoi diagram generation code was adapted from [Alex Beutel](http://alexbeutel.com)'s Interactive [Voronoi Diagram Generator with WebGL](http://alexbeutel.com/webgl/voronoi.html). I'm really grateful for the code example, it really made things easier and faster.
