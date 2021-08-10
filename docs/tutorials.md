# FuseML Tutorials

Testing FuseML is simpler than one may think. Let's showcase some use cases.

## Example 1 - A simple logistic regression with MLFlow and KFServing

This example shows how FuseML can be used to automate and end-to-end machine learning workflow using
a combination of different tools. In this case, we have a scikit-learn ML model that is being trained
with MLflow and then served with KFServing.

We assume that both the FuseML infrastructure and the FuseML CLI are already installed, if not please
check first the [quick start](quickstart.md) section.

**1.** Install 3rd party ML tools

Running this example requires MLFlow and KFServing to be installed in the same cluster as FuseML. For your
convenience, an MLFlow tracking server is already deployed as part of the main FuseML installation. 

For a quick KFServing installation, you can use the scripts already hosted in the fuseml GitHub repository.
Running the following will install KFServing on your cluster, along with all its prerequisites (cert-manager,
istio and knative): 

```bash
git clone --depth 1 -b release-0.1 https://github.com/fuseml/fuseml.git fuseml-scripts
cd fuseml-scripts
make kfserving-install
```

Alternatively, you can follow [the KFServing official instructions](https://github.com/kubeflow/kfserving/blob/master/README.md)
and install KFServing manually.

**2.** Set the FUSEML_SERVER_URL environment variable to point to the server URL

The fuseml server URL is printed out by the installer during the FuseML installation. If you missed it, you can retrieve it at 
any time with the following command:

```bash
export FUSEML_SERVER_URL=http://$(kubectl get VirtualService -n fuseml-core fuseml-core -o jsonpath="{.spec.hosts[0]}")
```

**3.** Get the example code

```bash
git clone --depth 1 -b release-0.1 https://github.com/fuseml/examples.git
cd examples
```

Under the `codesets/mlflow` directory, there are some example MLflow projects. The `sklearn` one is a slightly modified version of the upstream MLflow public example [here](https://mlflow.org/docs/latest/tutorials-and-examples/tutorial.html).

**4.** Register the codeset

Register the example code as a FuseML versioned codeset artifact:

```bash
fuseml codeset register --name "mlflow-test" --project "mlflow-project-01" codesets/mlflow/sklearn
```

Example output:

```bash
> fuseml codeset register --name "mlflow-test" --project "mlflow-project-01" codesets/mlflow/sklearn
2021/06/07 18:30:08 Pushing the code to the git repository...
Codeset http://gitea.10.162.66.101.omg.howdoi.website/mlflow-project-01/mlflow-test.git successfully registered
Username for accessing the project: <username>
Password for accessing the project: <password>
```

You may optionally log into the Gitea UI using the URL, username and password printed out by the `codeset register` command. You should find a new organization named `mlflow-project-01` and a repo named `mlflow-test`.

**5.** Create a workflow

The example FuseML workflow included in the examples repository represents a complete, end-to-end ML pipeline "compatible" with any codeset that contains an MLProject. It includes all the steps necessary to train a model with MLFlow, save the model and then create a KFServing prediction service for it. 

The workflow definition example has some hardcoded values that need to be changed for your specific environment. Namely, see the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY values: these are the credentials to the S3 based minio store that was installed to your cluster by fuseml-installer.

To get these values from your cluster setup and replace them in the workflow definition, run:

```bash
export ACCESS=$(kubectl get secret -n fuseml-workloads mlflow-minio -o json| jq -r '.["data"]["accesskey"]' | base64 -d)
export SECRET=$(kubectl get secret -n fuseml-workloads mlflow-minio -o json| jq -r '.["data"]["secretkey"]' | base64 -d)
sed -i -e "/AWS_ACCESS_KEY_ID/{N;s/value: [^ \t]*/value: $ACCESS/}" workflows/mlflow-e2e.yaml
sed -i -e "/AWS_SECRET_ACCESS_KEY/{N;s/value: [^ \t]*/value: $SECRET/}" workflows/mlflow-e2e.yaml
```

Use the modified example workflow definition to create a workflow in FuseML:

```bash
fuseml workflow create workflows/mlflow-e2e.yaml
```

**6.** Assign the codeset to the workflow

```bash
fuseml workflow assign --name mlflow-e2e --codeset-name mlflow-test --codeset-project mlflow-project-01
``` 

**7.** Monitor the workflow from the command-line

Now that the Workflow is assigned to the Codeset, a new workflow run was created. To watch the workflow progress, check "workflow run" with:

```bash
fuseml workflow list-runs --name mlflow-e2e
```

Example output:

```
> fuseml workflow list-runs --name mlflow-e2e
+--------------------------------------------+------------+--------------+----------+---------+
| NAME                                       | WORKFLOW   | STARTED      | DURATION | STATUS  |
+--------------------------------------------+------------+--------------+----------+---------+
| fuseml-mlflow-project-01-mlflow-test-mlprp | mlflow-e2e | 1 minute ago | ---      | Running |
+--------------------------------------------+------------+--------------+----------+---------+
```

This command shows you detailed information about running workflow. You may also follow the Tekton URL value under the expanded output section to see relevant information about the underlying Tekton PipelineRun which implements the workflow run:


```
> fuseml workflow list-runs --name mlflow-e2e --format yaml
---
- name: fuseml-mlflow-project-01-mlflow-test-hr67k
  workflowref: mlflow-e2e
  inputs:
  - input:
      name: mlflow-codeset
      description: an MLFlow compatible codeset
      type: codeset
      default: null
      labels: []
    value: http://gitea.10.162.66.101.omg.howdoi.website/mlflow-project-01/mlflow-test.git:main
  - input:
      name: predictor
      description: type of predictor engine
      type: string
      default: auto
      labels: []
    value: auto
  outputs:
  - output:
      name: prediction-url
      description: The URL where the exposed prediction service endpoint can be contacted to run predictions.
      type: string
    value: null
  starttime: 2021-06-07T18:16:00Z
  completiontime: null
  status: Running
  url: "http://tekton.10.162.66.101.omg.howdoi.website/#/namespaces/fuseml-workloads/pipelineruns/fuseml-mlflow-project-01-mlflow-test-hr67k"
```

Once the run succeeds, the status value changes to `Succeeded` in the CLI:

```
> fuseml workflow list-runs --name mlflow-e2e
+--------------------------------------------+------------+----------------+------------+-----------+
| NAME                                       | WORKFLOW   | STARTED        | DURATION   | STATUS    |
+--------------------------------------------+------------+----------------+------------+-----------+
| fuseml-mlflow-project-01-mlflow-test-mlprp | mlflow-e2e | 22 minutes ago | 22 minutes | Succeeded |
+--------------------------------------------+------------+----------------+------------+-----------+
```

**8.** Access the prediction service

When the workflow run is complete, a new prediction service is created and registered as a FuseML application entry. You can check the applications list with:

```bash
fuseml application list
```

This should produce output similar to this one:

```
> fuseml application list
+-------------------------------+-----------+----------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------+------------+
| NAME                          | TYPE      | DESCRIPTION                                  | URL                                                                                                                                  | WORKFLOW   |
+-------------------------------+-----------+----------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------+------------+
| mlflow-project-01-mlflow-test | predictor | Application generated by mlflow-e2e workflow | http://mlflow-project-01-mlflow-test.fuseml-workloads.10.162.66.101.omg.howdoi.website/v2/models/mlflow-project-01-mlflow-test/infer | mlflow-e2e |
+-------------------------------+-----------+----------------------------------------------+--------------------------------------------------------------------------------------------------------------------------------------+------------+
```

Use the URL from the new application to run the prediction. The example already includes a prediction data example:

```bash
cat prediction/data-sklearn.json
{
    "inputs": [
    {
        "name": "input-0",
        "shape": [1, 11],
        "datatype": "FP32",
        "data": [
        [12.8, 0.029, 0.48, 0.98, 6.2, 29, 7.33, 1.2, 0.39, 90, 0.86]
        ]
    }
    ]
}
```

which you can pass to the prediction service:

```bash
export PREDICTOR_URL=http://mlflow-project-01-mlflow-test.fuseml-workloads.10.162.66.101.omg.howdoi.website/v2/models/mlflow-project-01-mlflow-test/infer

curl -d @prediction/data-sklearn.json $PREDICTOR_URL

The output should look like

{
    "model_name":"mlflow-project-01-mlflow-test",
    "model_version":null,
    "id":"44d5d037-052b-49b6-aace-1c5346a35004",
    "parameters":null,
    "outputs": [
    {
        "name":"predict",
        "shape":[1],
        "datatype":"FP32",
        "parameters":null,
        "data": [ 6.486344809506676 ]
    }
    ]
}
```

**9.** (Optional) Use the webapp example

Rather than using curl to exercise the prediction service, you may use a simple app we developed using [streamlit](https://streamlit.io/).

First, you need to install streamlit as covered [in the official documentation](https://docs.streamlit.io/en/stable/troubleshooting/clean-install.html). The short version using `pip` is this:

```bash
python3 -m venv env
source env/bin/activate
pip install streamlit
```

To start the application, then just run:

```bash
streamlit run webapps/wineapp.py
```

Follow the instructions presented in the webpage to make your own prediction with the FuseML application you just deployed.
