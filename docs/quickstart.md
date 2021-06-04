# Quick Start

In order to use FuseML one may simply do the following:

### 1. Install the basics

We assume that a Kubernetes cluster is already up and running. If not a good way to start with a local cluster is to use [KinD](https://kind.sigs.k8s.io/docs/user/quick-start/) or [Rancher K3s](https://k3s.io/)

### 2. Download and install the fuseml-installer

```bash
    # On Linux
    curl -sfL https://fuseml.github.io/in/installer.ps1 | sh -
```

You should get an output similar to this:

```bash
********* SUCCESS **********
FuseML Installer is ready!
To start using it just run fuseml-installer --help and enjoy!
****************************
```

### 3. Fuseml Installer is ready to go so let's install the components on the cluster:

```bash
fuseml-installer install
```

### 4. Check if the components are up and running:

```bash
# Let's check the fuseml-core component
kubectl get pods -n fuseml-core -o wide
# Now let's check gitea
kubectl get pods -n gitea -o wide
# Let's check tekton
kubectl get pods -n tekton-pipelines -o wide
```

If everything is in running or completed status we are good to go. Let's point ourselves to the [tutorial](../tutorials.md) and start to have fun with FuseML.