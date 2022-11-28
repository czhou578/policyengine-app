import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { copySearchParams } from "../api/call";
import { findInTree } from "../api/variables";
import NavigationButton from "../controls/NavigationButton";
import SearchOptions from "../controls/SearchOptions";
import FolderPage from "../layout/FolderPage";
import LoadingCentered from "../layout/LoadingCentered";
import useMobile from "../layout/Responsive";
import StackedMenu from "../layout/StackedMenu";
import ThreeColumnPage from "../layout/ThreeColumnPage";
import style from "../style";
import ParameterEditor from "./policy/input/ParameterEditor";
import PolicyOutput from "./policy/output/PolicyOutput";
import PolicyRightSidebar from "./policy/PolicyRightSidebar";

const POLICY_OUTPUT_TREE = [
  {
    name: "policyOutput",
    label: "Policy impact",
    children: [
      {
        name: "policyOutput.netIncome",
        label: "Budgetary impact",
      },
      {
        name: "policyOutput.decileRelativeImpact",
        label: "Relative impact by decile",
      },
      {
        name: "policyOutput.decileAverageImpact",
        label: "Average impact by decile",
      },
      {
        name: "policyOutput.intraDecileImpact",
        label: "Outcomes by income decile",
      },
      {
        name: "policyOutput.povertyImpact",
        label: "Poverty impact",
      },
      {
        name: "policyOutput.cliffImpact",
        label: "Cliff impact",
      },
      {
        name: "policyOutput.codeReproducibility",
        label: "Reproduce in Python",
      },
    ],
  }];

function ParameterSearch(props) {
  const { metadata } = props;
  const [searchParams, setSearchParams] = useSearchParams();
  const options = Object.values(metadata.parameters)
    .filter((parameter) => parameter.type === "parameter")
    .map((parameter) => ({
      value: parameter.parameter,
      label: parameter.label,
    }))
    .filter((option) => !!option.label && !!option.value);
  return (
    <SearchOptions
      options={options}
      defaultValue={null}
      style={{ margin: 0, width: "100%" }}
      placeholder="Search for a parameter"
      onSelect={(value) => {
        let newSearch = copySearchParams(searchParams);
        newSearch.set("focus", value);
        setSearchParams(newSearch);
      }}
    />
  );
}

function PolicyLeftSidebar(props) {
  const { metadata } = props;
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get("focus") || "";
  const onSelect = (name) => {
    let newSearch = copySearchParams(searchParams);
    newSearch.set("focus", name);
    setSearchParams(newSearch);
  };
  // The menu, then the search bar anchored to the bottom
  return (
    <div>
      <div style={{padding: 10}}><ParameterSearch metadata={metadata} /></div>
      <StackedMenu
        firstTree={metadata.parameterTree.children}
        selected={selected}
        onSelect={onSelect}
        secondTree={POLICY_OUTPUT_TREE[0].children}
      />
    </div>
  );
}

function MobileTreeNavigationHolder(props) {
  const { metadata } = props;
  // Try to find the current focus in the tree.
  const [searchParams, setSearchParams] = useSearchParams();
  const focus = searchParams.get("focus");
  let currentNode;
  if (focus && focus.startsWith("policyOutput")) {
    currentNode = { children: POLICY_OUTPUT_TREE };
  } else {
    currentNode = {children: [metadata.parameterTree]};
  }
  let breadcrumbs = [];
  try {
    let stem = "";
    for (let name of focus.split(".")) {
      stem += name;
      const fixedStem = stem;
      currentNode = currentNode.children.find((node) => node.name === fixedStem);
      breadcrumbs.push({
        name: stem,
        label: currentNode.label,
      });
      stem += ".";
    }
  } catch (e) {
    currentNode = null;
  }
  return <div style={{
      display: "flex",
      justifyContent: "center", 
      alignItems: "center", 
      height: "100%", 
      padding: 15, 
      backgroundColor: style.colors.LIGHT_GRAY,
    }}>
      {breadcrumbs.map((breadcrumb, i) => (
        <h5
          key={breadcrumb.name}
          style={{
            margin: 0,
            cursor: "pointer",
          }}
          onClick={() => {
            let newSearch = copySearchParams(searchParams);
            newSearch.set("focus", breadcrumb.name);
            setSearchParams(newSearch);
          }}
        >
          {breadcrumb.label}
          {i < breadcrumbs.length - 1 && <span style={{color: style.colors.DARK_GRAY, paddingRight: 5}}> &gt; </span>}
        </h5>
      ))}
    </div>
}


function MobileBottomMenu(props) {
  const { metadata } = props;
  const [searchParams] = useSearchParams();
  const hasReform = searchParams.get("reform") !== null;
  const focus = searchParams.get("focus") || "";
  return <div style={{
    padding: 20,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "20vh",
  }}>
    <div>
    {
      focus && focus.startsWith("policyOutput") && <NavigationButton text="Edit my policy" focus="gov" />
    }
    {
      focus && !focus.startsWith("policyOutput") && <NavigationButton text="Calculate economic impact" focus="policyOutput.netIncome" />
    }
    {
      !hasReform && <NavigationButton text="Enter my household" focus="input" target={`/${metadata.countryId}/household`} />
    }
    {
      hasReform && <NavigationButton text="Edit my household" focus="input" target={`/${metadata.countryId}/household`} />
    }

    </div>
  </div>
}

function MobilePolicyPage(props) {
  const { mainContent, metadata } = props;
  return <>
    <div style={{
      overflow: "scroll",
      width: "100%",
      padding: 20,
      height: "60vh",
    }}>
      {mainContent}
    </div>
    <MobileTreeNavigationHolder title="Your reform" metadata={metadata}/>
    <MobileBottomMenu metadata={metadata}/>
  </>
}

export default function PolicyPage(props) {
  const { metadata, policy, setPolicy } = props;
  const mobile = useMobile();

  const [searchParams, setSearchParams] = useSearchParams();
  const focus = searchParams.get("focus") || "";

  useEffect(() => {
    if (!focus) {
      let newSearch = copySearchParams(searchParams);
      newSearch.set("focus", "gov");
      setSearchParams(newSearch);
    }
  });

  // If we've landed on the page without a reform policy, create a new one.
  useEffect(() => {
    if (!policy.reform.data && !searchParams.get("reform")) {
      let newSearch = copySearchParams(searchParams);
      newSearch.set("reform", metadata.countryId === "us" ? 2 : 1);
      setSearchParams(newSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!policy.reform.data]);

  let middle = null;

  if (!policy.reform.data) {
    middle = <LoadingCentered />;
  } else if (Object.keys(metadata.parameters).includes(focus) && metadata.parameters[focus].type === "parameter") {
    middle = (
      <ParameterEditor
        parameterName={focus}
        metadata={metadata}
        policy={policy}
        setPolicy={setPolicy}
      />
    );
  } else if (Object.keys(metadata.parameters).includes(focus)) {
    const node = findInTree({ children: [metadata.parameterTree]}, focus);
    middle = <FolderPage
      label={node.label}
      children={node.children}
      />
  } else if (focus === "policyOutput") {
    middle = <FolderPage
      label="Policy impact"
      children={POLICY_OUTPUT_TREE[0].children}
    />;
  } else if (focus.includes("policyOutput.")) {
    middle = <PolicyOutput metadata={metadata} policy={policy} />;
  }

  if (mobile) {
    return <MobilePolicyPage mainContent={middle} metadata={metadata} />
  }

  return (
    <ThreeColumnPage
      left={<PolicyLeftSidebar metadata={metadata} />}
      middle={middle}
      right={<PolicyRightSidebar
              metadata={metadata}
              policy={policy}
              setPolicy={setPolicy}
            />
          }
    />
  );
}