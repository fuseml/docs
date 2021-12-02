# Quick Start

In order to use FuseML one may simply do the following:

## 1. Install Requirements

We assume that a Kubernetes cluster is already up and running. If not a good way to start with a local cluster is to use [KinD](https://kind.sigs.k8s.io/docs/user/quick-start/), [Rancher K3s](https://k3s.io/) or [k3d](https://k3d.io/).

It is also necessary that your cluster setup includes a storage class marked as default.

**IMPORTANT**: if you're installing a Rancher K3s cluster, it's recommended to skip installing the default Traefik ingress controller. The FuseML installer deploys Istio as a component and Istio is also required by some of the 3rd party tools that FuseML is integrated with (e.g. Knative, KServe).

Additional software requirements:

- _helm_: install the package provided by your OS, or check [upstream installation guide](https://helm.sh/docs/intro/install/)

- _kubectl_: install the package provided by your OS, or check [upstream installation guide](https://kubernetes.io/docs/tasks/tools/#kubectl)

## 2. Get `fuseml-installer`

```bash
# On Linux
curl -sfL https://raw.githubusercontent.com/fuseml/fuseml/main/install.sh | sh -
```

You should get an output similar to this:

```bash
Verifying checksum... Done.
Preparing to install fuseml-installer into /usr/local/bin
fuseml-installer installed into /usr/local/bin/fuseml-installer
Run 'fuseml-installer --help' to see what you can do with it.
```

## 3. Install FuseML

```bash
fuseml-installer install
```

You should get an output similar to this:

```bash
> fuseml-installer install

🚢 FuseML installing...

Configuration...
  🧭  system_domain:
  🧭  extensions_repository: https://raw.githubusercontent.com/fuseml/extensions/main/installer/
  🧭  force_reinstall: false

🚢 Deploying Istio.....
✔️  Istio deployed
✔️  Created system_domain: 172.18.0.3.nip.io

🚢 Deploying Workloads...
✔️  Workloads deployed

🚢 Deploying Gitea......................................................
✔️  Gitea deployed (http://gitea.172.18.0.3.nip.io).

🚢 Deploying Registry...............
✔️  Registry deployed

🚢 Deploying Tekton................................................................................
✔️  Tekton deployed (http://tekton.172.18.0.3.nip.io).

🚢 Deploying Core..............
✔️  FuseML core component deployed (http://fuseml-core.172.18.0.3.nip.io).

🚢 Downloading command line client...
🚢 FuseML command line client saved as /Users/flaviosr/workspace/fuseml/fuseml.
Copy it to the location within your PATH (e.g. /usr/local/bin).

🚢 To use the FuseML CLI, you must point it to the FuseML server URL, e.g.:

    export FUSEML_SERVER_URL=http://fuseml-core.172.18.0.3.nip.io

✔️  FuseML installed.
System domain: 172.18.0.3.nip.io
```

The FuseML installer prints out URLs for _gitea_, _tekton_ and _fuseml-core_ components. You can access those sub-services directly at any given time. The fuseml-core URL is especially important, as you'll need that to use the FuseML CLI.

You can also see that the installer downloaded _fuseml_ command line client which you will use for actual FuseML operations. You can use the latest version which was downloaded automatically or manually choose one of [released versions](https://github.com/fuseml/fuseml-core/releases) from github.

Run the following command to see the list of available commands:

```bash
fuseml-installer install --help
```

## 4. Ensure FuseML components are up and running

```bash
# Check Istio
kubectl get pods -n istio-system -o wide
# Check Gitea
kubectl get pods -n gitea -o wide
# Check registry
kubectl get pods -n fuseml-registry -o wide
# Check tekton
kubectl get pods -n tekton-pipelines -o wide
# Check fuseml-core
kubectl get pods -n fuseml-core -o wide
```

If everything is in running or completed status, you are good to go. Continue with one of the available tutorials, such as the [MLFlow and KServe basic example](tutorials/kserve-basic.md) and start to have fun with FuseML.
